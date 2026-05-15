// ========================================
//  FeedHope — Omar & Hanan — index.js
// ========================================

// Silence all console output — only the startup message below should appear
// in the terminal. Re-enable any of these temporarily if you need to debug.
const noop = () => {};
console.log = noop;
console.error = noop;
console.warn = noop;
console.info = noop;
console.debug = noop;

import 'dotenv/config'; // loads GEMINI_API_KEY (and any other vars) from .env
import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bcrypt from "bcryptjs";  // for password hashing
import { GoogleGenerativeAI } from "@google/generative-ai";

// All of them are for the Profile Picture (Add/delete/change)
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB limit

const app = express();

// Allow cross-origin requests (React frontend on port 3000 talks to this server on 5000)
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─────────────────────────────────────────────────────────────
//  MySQL Connection Pool
// ─────────────────────────────────────────────────────────────
const pool = mysql.createPool({
    host: "localhost",        // Database server address
    user: "root",             // MySQL username
    password: "",             // MySQL password (empty for XAMPP default)
    database: "omar&hanan_feedhope", // The database name from the schema
    waitForConnections: true, // Queue requests if all connections are busy
    connectionLimit: 10,      // Max 10 simultaneous connections in the pool
    queueLimit: 0             // 0 = unlimited queued requests
}).promise(); // Use promise-based API so we can use async/await


// Helper: validate password length rules (3-10 characters)
const isValidPassword = (pwd) => pwd && pwd.length >= 3 && pwd.length <= 10;

// ==============================================================
// ──────────────── REGISTRATIONS ───────────────────────────────
// ==============================================================

// ──── 1. Donor Registration ────
app.post("/api/register/donor", async (req, res) => {
    // Destructure all expected fields from the request body
    const { organizationName, email, password, phone, businessType, street, city, country, latitude, longitude, foundationDate } = req.body;

    // Validate password length before doing any DB work
    if (!password || password.length < 3 || password.length > 10) {
        return res.status(400).json({ error: "Password must be between 3 and 10 characters long." });
    }

    // Get a dedicated connection from the pool for this transaction
    const conn = await pool.getConnection();
    try {
        // Start a transaction — all inserts succeed together or all roll back
        await conn.beginTransaction();

        // Hash the plain-text password with bcrypt (salt rounds = 10)
        const hash = await bcrypt.hash(password, 10);

        // Insert the core User record; status starts as 'pending' until email is verified
        const [u] = await conn.query(
            "INSERT INTO User (name, email, password, phone_number, status) VALUES (?,?,?,?,'pending')",
            [organizationName, email, hash, phone]
        );
        const uid = u.insertId; // The auto-generated user_id

        // Sanitize latitude and longitude
        let lat = (latitude && !isNaN(parseFloat(latitude))) ? parseFloat(latitude) : null;
        let lng = (longitude && !isNaN(parseFloat(longitude))) ? parseFloat(longitude) : null;


        const [a] = await conn.query(
            "INSERT INTO Address (street, city, country, latitude, longitude, user_id) VALUES (?,?,?,?,?,?)",
            [street, city, country, lat, lng, uid]
        );

        // Create a Role row for 'Donor' and link it in User_Role
        const [r] = await conn.query("INSERT INTO Role (role_name, user_id) VALUES ('Donor', ?)", [uid]);
        await conn.query("INSERT INTO User_Role (user_id, role_id) VALUES (?,?)", [uid, r.insertId]);

        // Insert the Donor-specific record
        await conn.query(
            "INSERT INTO Donor (organization_name, business_type, foundation_date, user_id, address_id) VALUES (?,?,?,?,?)",
            [organizationName, businessType, foundationDate, uid, a.insertId]
        );

        // Generate a 6-digit email verification code valid for 24 hours
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Remove any existing verification row for this email, then insert a fresh one
        await conn.query("DELETE FROM Email_verification WHERE email = ?", [email]);
        await conn.query(
            "INSERT INTO Email_verification (email, verified, expired_at, verify_at, user_id) VALUES (?, 0, ?, NULL, ?)",
            [email, expiredAt, uid]
        );

        // Log the code to the console (dev mode — in production you'd send an email)
        console.log(`[DEV] Email Verification Code for ${email}: ${verificationCode}`);

        // Write a syslog entry for audit purposes
        await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Registration', 'Donor account created — email verification pending', uid]
        );

        // ── ADMIN NOTIFICATION: new registration ──
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, NULL, NOW())`,
            [
                'New Registration',
                `Donor "${organizationName}" (${email}) has registered and is pending email verification.`,
                'new_registration'
            ]
        );

        // Commit all inserts as one atomic operation
        await conn.commit();
        res.status(201).json({
            message: "Donor registered successfully. Please verify your email.",
            verificationCode // Remove in production — send via real email instead
        });
    } catch (e) {
        // If anything fails, undo all inserts so the DB stays clean
        await conn.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        // Always release the connection back to the pool
        conn.release();
    }
});


// ──── 2. Receiver Registration ────
app.post("/api/register/receiver", async (req, res) => {
    const { organizationName, email, password, phone, orgType, street, city, country, latitude, longitude, foundationDate } = req.body;

    if (!password || password.length < 3 || password.length > 10) {
        return res.status(400).json({ error: "Password must be between 3 and 10 characters long." });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const hash = await bcrypt.hash(password, 10);

        // Insert the core User record
        const [u] = await conn.query(
            "INSERT INTO User (name, email, password, phone_number, status) VALUES (?,?,?,?,'pending')",
            [organizationName, email, hash, phone]
        );
        const uid = u.insertId;

        // Sanitize latitude and longitude
        let lat = (latitude && !isNaN(parseFloat(latitude))) ? parseFloat(latitude) : null;
        let lng = (longitude && !isNaN(parseFloat(longitude))) ? parseFloat(longitude) : null;


        const [a] = await conn.query(
            "INSERT INTO Address (street, city, country, latitude, longitude, user_id) VALUES (?,?,?,?,?,?)",
            [street, city, country, lat, lng, uid]
        );


        // Create Role row and link it
        const [r] = await conn.query("INSERT INTO Role (role_name, user_id) VALUES ('Receiver', ?)", [uid]);
        await conn.query("INSERT INTO User_Role (user_id, role_id) VALUES (?,?)", [uid, r.insertId]);

        // Insert the Receiver-specific record
        const [rec] = await conn.query(
            "INSERT INTO Receiver (organization_name, business_type, foundation_date, user_id) VALUES (?,?,?,?)",
            [organizationName, orgType, foundationDate, uid]
        );

        // Insert the Receiver_location record linking the receiver to their address
        await conn.query(
            "INSERT INTO Receiver_location (contact_phone, receiver_id, address_id) VALUES (?,?,?)",
            [phone, rec.insertId, a.insertId]
        );

        // Generate 6-digit verification code valid for 24 hours
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await conn.query("DELETE FROM Email_verification WHERE email = ?", [email]);
        await conn.query(
            "INSERT INTO Email_verification (email, verified, expired_at, verify_at, user_id) VALUES (?, 0, ?, NULL, ?)",
            [email, expiredAt, uid]
        );

        console.log(`[DEV] Email Verification Code for ${email}: ${verificationCode}`);

        await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Registration', 'Receiver account created — email verification pending', uid]
        );

        // ── ADMIN NOTIFICATION: new registration ──
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, NULL, NOW())`,
            [
                'New Registration',
                `Receiver "${organizationName}" (${email}) has registered and is pending email verification.`,
                'new_registration'
            ]
        );

        await conn.commit();
        res.status(201).json({
            message: "Receiver registered successfully. Please verify your email.",
            verificationCode
        });
    } catch (e) {
        await conn.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        conn.release();
    }
});

// ──── 3. Volunteer Registration ────
app.post("/api/register/volunteer", async (req, res) => {
    const { fullName, email, password, phone, gender, birthdate, vehicleType, plateNumber } = req.body;

    if (!password || password.length < 3 || password.length > 10) {
        return res.status(400).json({ error: "Password must be between 3 and 10 characters long." });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const hash = await bcrypt.hash(password, 10);

        const [u] = await conn.query(
            "INSERT INTO User (name, email, password, phone_number, status) VALUES (?,?,?,?,'pending')",
            [fullName, email, hash, phone]
        );
        const uid = u.insertId;

        const [r] = await conn.query("INSERT INTO Role (role_name, user_id) VALUES ('Volunteer', ?)", [uid]);
        await conn.query("INSERT INTO User_Role (user_id, role_id) VALUES (?,?)", [uid, r.insertId]);

        await conn.query(
            "INSERT INTO Volunteer (vehicle_type, plate_number, birthdate, gender, user_id) VALUES (?,?,?,?,?)",
            [vehicleType, plateNumber, birthdate, gender, uid]
        );

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await conn.query("DELETE FROM Email_verification WHERE email = ?", [email]);
        await conn.query(
            "INSERT INTO Email_verification (email, verified, expired_at, verify_at, user_id) VALUES (?, 0, ?, NULL, ?)",
            [email, expiredAt, uid]
        );

        console.log(`[DEV] Email Verification Code for ${email}: ${verificationCode}`);

        await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Registration', 'Volunteer account created — email verification pending', uid]
        );

        // ── ADMIN NOTIFICATION: new registration ──
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
            VALUES (?, ?, ?, NULL, NOW())`,
            [
                'New Registration',
                `Volunteer "${fullName}" (${email}) has registered and is pending email verification.`,
                'new_registration'
            ]
        );

        await conn.commit();
        res.status(201).json({
            message: "Volunteer registered successfully. Please verify your email.",
            verificationCode
        });
    } catch (e) {
        await conn.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        conn.release();
    }
});



// ==============================================================
// ──────────────── ROLE SWITCH / DUAL ROLE  ────────────────────
// ==============================================================

// ──── GET /api/user/roles/:userId ────
// Returns all roles for a user. Used by the role-switch UI to refresh after
// a "Become a Volunteer" upgrade or to verify state on demand.
app.get('/api/user/roles/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [[adminRow]] = await pool.query(
            "SELECT admin_id FROM Admin WHERE user_id = ?",
            [userId]
        );
        if (adminRow) {
            return res.json({ roles: ['Admin'] });
        }
        const [rows] = await pool.query(
            "SELECT DISTINCT role_name FROM Role WHERE user_id = ?",
            [userId]
        );
        res.json({ roles: rows.map(r => r.role_name) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch roles.' });
    }
});

// ──── POST /api/become-volunteer/:userId ────
// Adds Volunteer to an existing Donor or Receiver. Admins can't switch
// (rejected with 403). Idempotent: returns 409 if user already has Volunteer.
//
// Body: { vehicleType, plateNumber, birthdate, gender }
app.post('/api/become-volunteer/:userId', async (req, res) => {
    const { userId } = req.params;
    const { vehicleType, plateNumber, birthdate, gender } = req.body || {};

    if (!vehicleType || !plateNumber || !birthdate || !gender) {
        return res.status(400).json({
            error: 'vehicleType, plateNumber, birthdate, and gender are all required.'
        });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Verify user exists and is active
        const [[user]] = await conn.query(
            "SELECT user_id, name, email, status FROM User WHERE user_id = ?",
            [userId]
        );
        if (!user) {
            await conn.rollback();
            return res.status(404).json({ error: 'User not found.' });
        }
        if (user.status !== 'active') {
            await conn.rollback();
            return res.status(403).json({ error: 'Account is not active.' });
        }

        // Admins can't add roles
        const [[adminRow]] = await conn.query(
            "SELECT admin_id FROM Admin WHERE user_id = ?",
            [userId]
        );
        if (adminRow) {
            await conn.rollback();
            return res.status(403).json({ error: 'Admins cannot switch roles.' });
        }

        // Must already be a Donor or Receiver to upgrade
        const [existing] = await conn.query(
            "SELECT role_name FROM Role WHERE user_id = ?",
            [userId]
        );
        const existingRoles = existing.map(r => r.role_name);
        if (existingRoles.includes('Volunteer')) {
            await conn.rollback();
            return res.status(409).json({ error: 'User is already a volunteer.' });
        }
        if (!existingRoles.includes('Donor') && !existingRoles.includes('Receiver')) {
            await conn.rollback();
            return res.status(400).json({
                error: 'Only existing Donors or Receivers can upgrade to Volunteer.'
            });
        }

        // 1. Volunteer table entry
        await conn.query(
            "INSERT INTO Volunteer (vehicle_type, plate_number, birthdate, gender, user_id) VALUES (?,?,?,?,?)",
            [vehicleType, plateNumber, birthdate, gender, userId]
        );

        // 2. Role + User_Role link
        const [r] = await conn.query(
            "INSERT INTO Role (role_name, user_id) VALUES ('Volunteer', ?)",
            [userId]
        );
        await conn.query(
            "INSERT INTO User_Role (user_id, role_id) VALUES (?,?)",
            [userId, r.insertId]
        );

        // 3. Audit log
        await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['RoleAdded', 'User upgraded their account by adding the Volunteer role', userId]
        );

        // 4. Admin notification
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, NULL, NOW())`,
            [
                'Volunteer Upgrade',
                `${user.name} (${user.email}) added the Volunteer role to their existing account.`,
                'new_registration'
            ]
        );

        await conn.commit();

        const updatedRoles = [...existingRoles, 'Volunteer'];
        res.status(201).json({
            message: 'Volunteer role added successfully.',
            roles: updatedRoles
        });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message || 'Failed to add Volunteer role.' });
    } finally {
        conn.release();
    }
});


// ==============================================================
// ──────────────── EMAIL VERIFICATION ──────────────────────────
// ==============================================================

// ──── 4. Verify Email ────
app.post("/api/verify-email", async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: "Email and verification code are required." });
    }

    const conn = await pool.getConnection();
    try {
        // Look for a pending, non-expired verification entry matching this email
        const [rows] = await conn.query(
            "SELECT * FROM Email_verification WHERE email = ? AND verified = 0 AND expired_at > NOW()",
            [email]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: "Verification code is invalid or has expired. Please register again." });
        }

        const verif = rows[0];

        // Mark the verification record as done and stamp the time
        await conn.query(
            "UPDATE Email_verification SET verified = 1, verify_at = NOW() WHERE verification_id = ?",
            [verif.verification_id]
        );

        // Activate the user account so they can sign in
        await conn.query(
            "UPDATE User SET status = 'active' WHERE user_id = ?",
            [verif.user_id]
        );

        await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['EmailVerified', 'User email verified successfully', verif.user_id]
        );

        res.status(200).json({ message: "Email verified successfully! You can now sign in." });
    } catch (err) {
        console.error("Email Verification Error:", err);
        res.status(500).json({ error: "Internal server error." });
    } finally {
        conn.release();
    }
});


// ==============================================================
// ──────────────── SIGN IN ─────────────────────────────────────
// ==============================================================
app.post("/api/signin", async (req, res) => {
    const { email, password } = req.body;
    const conn = await pool.getConnection();

    try {
        // 1. Find user by email in the User table
        const [users] = await conn.query(
            "SELECT * FROM User WHERE email = ?",
            [email]
        );
        if (users.length === 0) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const user = users[0];

        // 2. Reject unverified or non-active accounts
        if (user.status === 'pending') {
            return res.status(403).json({ error: "Please verify your email before signing in." });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ error: "Account is not active." });
        }

        // 3. Compare the submitted password against the stored bcrypt hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        // 4. Check if this user is an admin by looking up the admin table
        const [[adminRow]] = await conn.query(
            "SELECT admin_id FROM Admin WHERE user_id = ?",
            [user.user_id]
        );
        const isAdmin = !!adminRow; // true if a matching row exists

        // 5. Determine ALL roles this user holds. Admin is single-role; everyone
        //    else may have one or two roles drawn from {Donor, Receiver, Volunteer}.
        let roles = [];
        if (isAdmin) {
            roles = ['Admin'];
        } else {
            const [rows] = await conn.query(
                "SELECT DISTINCT role_name FROM Role WHERE user_id = ?",
                [user.user_id]
            );
            roles = rows.map(r => r.role_name);
        }

        // Default current role: prefer the non-Volunteer role (since Volunteer
        // is the optional add-on). Falls back to the first role if only one.
        const current_role =
            roles.find(r => r !== 'Volunteer') || roles[0] || null;

        // 6. Write a syslog entry
        await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Login', `User logged in successfully as ${current_role || 'User'}`, user.user_id]
        );

        // 7. Return the user object — backwards-compatible `role` field plus
        //    new `roles` array and `current_role` used by the role-switch UI.
        res.status(200).json({
            message: "Sign in successful!",
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                phone_number: user.phone_number,
                role: current_role,         // legacy field
                roles,                       // ['Donor', 'Volunteer'] etc.
                current_role,                // role the UI is using right now
                ...(isAdmin && { admin_id: adminRow.admin_id })
            }
        });
    } catch (err) {
        console.error("[ERROR] Sign in error:", err);
        res.status(500).json({ error: "Sign in failed." });
    } finally {
        conn.release();
    }
});


// ==============================================================
// ──────────────── LOGOUT ──────────────────────────────────────
// ==============================================================
app.post("/api/logout", async (req, res) => {
    const { userId, role } = req.body;

    try {
        if (userId) {
            await pool.query(
                "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
                ['Logout', `User logged out successfully from ${role || 'System'}`, userId]
            );
        }
        res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("[ERROR] Logout syslog error:", err);
        // We still return 200 because we want the user to be able to leave even if syslog fails
        res.status(200).json({ message: "Logged out" });
    }
});

// ==============================================================
// ──────────────── FORGOT / RESET PASSWORD ─────────────────────
// ==============================================================

// ──── 6. Forgot Password ────
app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required." });
    }

    try {
        // Confirm the email exists in our system before generating a reset code
        const [users] = await pool.query("SELECT user_id FROM User WHERE email = ?", [email]);

        if (users.length === 0) {
            return res.status(404).json({ error: "This email is not registered." });
        }

        const userId = users[0].user_id;

        // Generate a 6-digit reset code that expires in 2 minutes
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + (2 * 60 * 1000));

        // Delete any previous reset token for this email, then insert the new one
        await pool.query("DELETE FROM Password_reset_token WHERE email = ?", [email]);
        await pool.query(
            "INSERT INTO Password_reset_token (email, token, expired_at, user_id) VALUES (?, ?, ?, ?)",
            [email, resetCode, expires, userId]
        );

        console.log(`Reset Code for ${email}: ${resetCode}`);

        res.json({
            message: "Reset code sent! Valid for 2 minutes.",
            code: resetCode // Remove in production — send via email
        });
    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ error: "Internal server error. Check backend console." });
    }
});

// ──── 7. Reset Password ────
app.post("/api/reset-password", async (req, res) => {
    const { email, token, newPassword } = req.body;

    if (!isValidPassword(newPassword)) {
        return res.status(400).json({ error: "New password must be between 3 and 10 characters." });
    }

    try {
        // Make sure the email actually exists
        const [userCheck] = await pool.query("SELECT user_id FROM User WHERE email = ?", [email]);

        if (userCheck.length === 0) {
            return res.status(404).json({ error: "This email does not exist in our records." });
        }

        // Verify the reset token is correct and has not expired
        const [tokenRows] = await pool.query(
            "SELECT * FROM Password_reset_token WHERE email = ? AND token = ? AND expired_at > NOW()",
            [email, token]
        );

        if (tokenRows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired reset code." });
        }

        // Hash the new password and update the User record
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE User SET password = ? WHERE email = ?", [hashedPassword, email]);

        // Delete the used token so it cannot be reused
        await pool.query("DELETE FROM Password_reset_token WHERE email = ?", [email]);

        res.json({ message: "Password reset successful!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error." });
    }
});

// ==============================================================
// ──────────────── CONTACT US ──────────────────────────────────
// ==============================================================

// ──── 8. Contact Us ────
app.post('/api/contact-us', async (req, res) => {
    const { full_name, email, message } = req.body;

    if (!full_name || !email || !message) {
        return res.status(400).json({ error: 'Full name, email, and message are required.' });
    }

    try {
        // Try to find a user_id for this email (optional — can be null for guests)
        const [users] = await pool.query('SELECT user_id FROM User WHERE email = ?', [email.trim()]);
        const user_id = users.length > 0 ? users[0].user_id : null;

        await pool.query(
            `INSERT INTO Contact_us (full_name, email, message, user_id) VALUES (?, ?, ?, ?)`,
            [full_name.trim(), email.trim(), message.trim(), user_id]
        );

        // ── ADMIN NOTIFICATION: new contact message ──
        const msgPreview = message.length > 100 ? message.substring(0, 100) + '...' : message;

        await pool.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
            VALUES (?, ?, ?, NULL, NOW())`,
            [
                'New Contact Message',
                `From: ${full_name} (${email})\nMessage: ${msgPreview}`,
                'contact_message'
            ]
        );

        res.status(201).json({ message: 'Your message has been sent successfully!' });
    } catch (err) {
        console.error('Contact Us DB Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


// ────────────────────────────── RECEIVER ──────────────────────────────────


// ==============================================================
// ──────────────── RECEIVER DASHBOARD API ──────────────────────
// ==============================================================

// ──── 9. Get Receiver Dashboard Data ────
// Returns: receiver profile info + stats + available food offers + notifications
// Called when the Receiver Dashboard page loads.
// URL param :userId is the user_id stored in localStorage after sign-in.
app.get("/api/receiver/dashboard/:userId", async (req, res) => {
    const { userId } = req.params; // Extract the user ID from the URL

    try {
        // ── Step 1: Get the receiver's profile info ──
        const [receiverRows] = await pool.query(`
            SELECT
                u.user_id,
                u.name,
                u.email,
                u.phone_number,
                u.profile_picture,
                r.receiver_id,
                r.organization_name,
                r.business_type   AS org_type,
                r.foundation_date,
                a.street,
                a.city,
                a.country,
                a.latitude,
                a.longitude
            FROM User u
            JOIN Receiver r        ON r.user_id    = u.user_id
            JOIN Receiver_location rl ON rl.receiver_id = r.receiver_id
            JOIN Address a         ON a.address_id = rl.address_id
            WHERE u.user_id = ?
            LIMIT 1
        `, [userId]);

        // If no receiver record is found, return 404
        if (receiverRows.length === 0) {
            return res.status(404).json({ error: "Receiver not found." });
        }

        const receiver = receiverRows[0]; // The receiver profile object

        // ── Step 2: Count available food offers ──
        // "Available" = Food_offer rows with status 'available'
        const [[{ availableCount }]] = await pool.query(`
            SELECT COUNT(*) AS availableCount
            FROM Food_offer
            WHERE status = 'available'
        `);

        // ── Step 3: Count offers this receiver has accepted ──
        // "Accepted" = Food_offer rows assigned to this receiver with status 'accepted'
        const [[{ acceptedCount }]] = await pool.query(`
            SELECT COUNT(*) AS acceptedCount
            FROM Food_offer
            WHERE receiver_id = ? AND status = 'accepted'
        `, [receiver.receiver_id]);

        // ── Step 4: Count incoming deliveries for this receiver ──
        // Incoming = active deliveries (volunteer has accepted, or is on the way).
        // Real delivery_status values are 'delivery_accepted' and 'in_delivery'
        // — the previous 'assigned' / 'in_transit' values are never written.
        const [[{ incomingCount }]] = await pool.query(`
            SELECT COUNT(*) AS incomingCount
            FROM Delivery d
            JOIN Food_offer fo ON fo.offer_id = d.offer_id
            WHERE fo.receiver_id = ?
              AND d.delivery_status IN ('delivery_accepted', 'in_delivery')
        `, [receiver.receiver_id]);

        // ── Step 5: Count total meals received ──
        // Sum number_of_person across offers that have been delivered to this
        // receiver. Computed from Food_offer (always populated) rather than the
        // Donation_history table (which holds kg, not meals/portions).
        const [[{ mealsReceived }]] = await pool.query(`
            SELECT COALESCE(SUM(number_of_person), 0) AS mealsReceived
            FROM Food_offer
            WHERE receiver_id = ?
              AND status IN ('delivered', 'completed')
        `, [receiver.receiver_id]);

        // ── Step 6: Get the latest available food offers (max 5 for the dashboard) ──
        // Offers expiring within the next 48 hours are surfaced first
        // (soonest-to-expire on top), then everything else by newest.
        const [offers] = await pool.query(`
            SELECT
                fo.offer_id,
                fo.food_name,
                fo.description,
                fo.number_of_person  AS portions,
                fo.pickup_time,
                fo.expiration_date_and_time,
                fo.status,
                u.name               AS donor_name,
                a.street             AS donor_street,
                a.city               AS donor_city
            FROM Food_offer fo
            JOIN Donor d   ON d.donor_id  = fo.donor_id
            JOIN User u    ON u.user_id   = d.user_id
            JOIN Address a ON a.address_id = d.address_id
            WHERE fo.status = 'available'
              AND (fo.expiration_date_and_time IS NULL
                   OR fo.expiration_date_and_time > NOW())
            ORDER BY
                CASE
                    WHEN fo.expiration_date_and_time IS NOT NULL
                     AND fo.expiration_date_and_time <= DATE_ADD(NOW(), INTERVAL 48 HOUR)
                    THEN 0 ELSE 1
                END,
                CASE
                    WHEN fo.expiration_date_and_time IS NOT NULL
                     AND fo.expiration_date_and_time <= DATE_ADD(NOW(), INTERVAL 48 HOUR)
                    THEN fo.expiration_date_and_time
                END ASC,
                fo.offer_id DESC
            LIMIT 5
        `);

        // ── Step 7: Get the latest notifications for this user (max 10) ──
        const [notifications] = await pool.query(`
            SELECT
                notification_id,
                message_title  AS title,
                message,
                type,
                read_at,
                date
            FROM Notifications
            WHERE user_id = ?
            ORDER BY date DESC
            LIMIT 10
        `, [userId]);

        // ── Step 8: Get the receiver's accepted offers ──
        const [acceptedOffers] = await pool.query(`
            SELECT
                fo.offer_id,
                fo.food_name,
                fo.status,
                u.name AS donor_name
            FROM Food_offer fo
            JOIN Donor d ON d.donor_id = fo.donor_id
            JOIN User  u ON u.user_id  = d.user_id
            WHERE fo.receiver_id = ?
            AND fo.status = 'accepted'
            ORDER BY fo.offer_id DESC
            LIMIT 5
        `, [receiver.receiver_id]);

        // ── Build the response object ──
        res.status(200).json({
            receiver,            // Full profile info
            stats: {
                availableOffers: Number(availableCount),   // Platform-wide available count
                myAccepted: Number(acceptedCount),    // This receiver's accepted count
                incomingDeliveries: Number(incomingCount),    // Active deliveries incoming
                mealsReceived: Number(mealsReceived)     // Total meals received historically
            },
            offers,              // Latest available food offers
            notifications,       // Latest notifications for this user
            acceptedOffers       // Offers this receiver has accepted
        });

    } catch (err) {
        console.error("Receiver dashboard error:", err);
        res.status(500).json({ error: "Failed to load dashboard data." });
    }
});
// ──── 10. Accept a Food Offer ────
// Called when the receiver clicks "Accept Offer" on the dashboard.
// Assigns the offer to this receiver and changes its status to 'accepted'.


// Helper: calculate max offers a receiver may accept based on total available offers
const getMaxAcceptablePerReceiver = (totalAvailableCount) => {
    // If only one offer exists, we can't prevent someone from taking it.
    if (totalAvailableCount <= 1) return 1;

    // Allow up to 3, but never more than 40% of the available offers (rounded down)
    let limit = Math.min(3, Math.floor(totalAvailableCount * 0.4));

    // Ensure the limit is at least 1 and that a receiver can NEVER take ALL available offers
    if (limit >= totalAvailableCount) limit = totalAvailableCount - 1;
    if (limit < 1) limit = 1;

    return limit;
};

// ──── Accept a Food Offer (updated with fairness limit) ────
app.post("/api/receiver/accept-offer", async (req, res) => {
    const { offerId, userId } = req.body;

    if (!offerId || !userId) {
        return res.status(400).json({ error: "Offer ID and User ID are required." });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1 - Get the actual receiver_id from the Receiver table using the user_id
        const [[receiver]] = await conn.query(
            "SELECT receiver_id, organization_name FROM Receiver WHERE user_id = ?",
            [userId]
        );

        if (!receiver) {
            await conn.rollback();
            return res.status(404).json({ error: "Receiver profile not found." });
        }
        const receiverId = receiver.receiver_id;

        // 2 - Verify the offer exists and is still available
        const [[offer]] = await conn.query(
            "SELECT * FROM Food_offer WHERE offer_id = ? AND status = 'available'",
            [offerId]
        );
        if (!offer) {
            await conn.rollback();
            return res.status(400).json({ error: "Offer is no longer available." });
        }

        // --- FAIRNESS CHECK: prevent a receiver from taking too many offers ---
        // Count total available offers (system-wide)
        const [[{ totalAvailable }]] = await conn.query(
            "SELECT COUNT(*) AS totalAvailable FROM Food_offer WHERE status = 'available'"
        );

        // Count how many offers this receiver has already accepted
        const [[{ currentAccepted }]] = await conn.query(
            "SELECT COUNT(*) AS currentAccepted FROM Food_offer WHERE receiver_id = ? AND status = 'accepted'",
            [receiverId]
        );

        // Compute the dynamic acceptance limit
        const limit = getMaxAcceptablePerReceiver(totalAvailable);
        if (currentAccepted >= limit) {
            await conn.rollback();
            return res.status(400).json({
                error: `Fairness limit reached. You may accept up to ${limit} offer${limit !== 1 ? 's' : ''} while only ${totalAvailable} offer${totalAvailable !== 1 ? 's are' : ' is'} available. Please wait for others to be delivered or cancelled.`
            });
        }
        // --- end of fairness check ---

        // 3 - Update the offer with the receiver_id
        await conn.query(
            "UPDATE Food_offer SET receiver_id = ?, status = 'accepted' WHERE offer_id = ?",
            [receiverId, offerId]
        );

        // 4 - Notify the receiver that they successfully accepted the offer
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role)
            VALUES ('Offer Accepted', ?, 'offer_accepted', ?, 'Receiver')`,
            [`You have successfully accepted the offer: "${offer.food_name}"`, userId]
        );

        // ── ADMIN NOTIFICATION: offer accepted ──
        const [[donorInfo]] = await conn.query(`
            SELECT u.name AS donor_name
            FROM Donor d
            JOIN User u ON u.user_id = d.user_id
            WHERE d.donor_id = ?
        `, [offer.donor_id]);

        const donorName = donorInfo ? donorInfo.donor_name : 'Unknown donor';
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
            VALUES (?, ?, ?, NULL, NOW())`,
            [
                'Offer Accepted',
                `Receiver "${receiver.organization_name || 'Organization'}" accepted the offer "${offer.food_name}" from ${donorName}.`,
                'offer_accepted'
            ]
        );

        await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Accept Offer', `Receiver accepted offer ID ${offerId} (${offer.food_name})`, userId]
        );

        await conn.commit();
        res.status(200).json({ message: "Offer accepted successfully!" });

    } catch (err) {
        await conn.rollback();
        console.error("Accept offer error:", err);
        res.status(500).json({ error: "Failed to accept offer." });
    } finally {
        conn.release();
    }
});


// ==============================================================
// ──────────────── RECEIVER Profile API ────────────────────────
// ==============================================================

// ==============================================================
// ──────────────── RECEIVER Profile API ────────────────────────
// ==============================================================

app.get("/api/receiver/profile/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        // ── Step 1: Fetch core profile data ──
        const [rows] = await pool.query(`
            SELECT
                u.user_id,
                u.name,
                u.email,
                u.phone_number,
                u.created_at AS joined_date,
                u.status,
                u.profile_picture,
                r.receiver_id,
                r.organization_name,
                r.business_type       AS org_type,
                r.foundation_date,
                a.street,
                a.city,
                a.country,
                a.latitude,
                a.longitude,
                rl.contact_phone
            FROM User u
            JOIN Receiver          r  ON r.user_id      = u.user_id
            JOIN Receiver_location rl ON rl.receiver_id = r.receiver_id
            JOIN Address           a  ON a.address_id   = rl.address_id
            WHERE u.user_id = ?
            LIMIT 1
        `, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Receiver profile not found." });
        }

        const profile = rows[0];

        // ── Step 2: Total Received ──
        // Count how many food offers have ever been accepted by this receiver.
        const [[{ totalReceived }]] = await pool.query(`
            SELECT COUNT(*) AS totalReceived
            FROM Food_offer
            WHERE receiver_id = ? AND status IN ('accepted', 'completed', 'delivered')
        `, [profile.receiver_id]);

        // ── Step 3: Deliveries Received ──
        // Count completed deliveries that correspond to this receiver's accepted offers.
        const [[{ deliveriesReceived }]] = await pool.query(`
            SELECT COUNT(*) AS deliveriesReceived
            FROM Delivery d
            JOIN Food_offer fo ON fo.offer_id = d.offer_id
            WHERE fo.receiver_id = ?
            AND d.delivery_status IN ('completed', 'delivered')
        `, [profile.receiver_id]);


        // ── Step 4: People Served ──
        // Sum number_of_person across all completed offers for this receiver.
        // This represents the total meals/people that benefited from donations.
        const [[{ peopleServed }]] = await pool.query(`
            SELECT COALESCE(SUM(fo.number_of_person), 0) AS peopleServed
            FROM Food_offer fo
            WHERE fo.receiver_id = ?
            AND fo.status IN ('accepted', 'completed', 'delivered')
        `, [profile.receiver_id]);

        // ──── Return everything ────
        res.status(200).json({
            profile,
            stats: {
                totalReceived: Number(totalReceived),
                peopleServed: Number(peopleServed),
                deliveriesReceived: Number(deliveriesReceived)
            }
        });

    } catch (err) {
        console.error("Profile GET error:", err);
        res.status(500).json({ error: "Failed to load profile." });
    }
});

// ==============================================================
// ──── PUT /api/receiver/profile/:userId (Edit Profile) ────────
//
//  Updates: User.name, User.email, User.phone_number
//           Address.street  (first address linked to this user)
//           Receiver.business_type (the org type)
// ==============================================================
app.put("/api/receiver/profile/:userId", async (req, res) => {
    const { userId } = req.params;
    const { name, email, phone, street, org_type, latitude, longitude } = req.body;

    // Basic validation — all fields are required
    if (!name || !email || !phone || !street || !org_type) {
        return res.status(400).json({ error: "All profile fields are required." });
    }

    // Sanitize lat/lon — optional, but validated against valid ranges if provided
    const lat = (latitude !== '' && latitude !== null && latitude !== undefined && !isNaN(parseFloat(latitude)))
        ? parseFloat(latitude) : null;
    const lon = (longitude !== '' && longitude !== null && longitude !== undefined && !isNaN(parseFloat(longitude)))
        ? parseFloat(longitude) : null;

    if (lat !== null && (lat < -90 || lat > 90)) {
        return res.status(400).json({ error: "Latitude must be between -90 and 90." });
    }
    if (lon !== null && (lon < -180 || lon > 180)) {
        return res.status(400).json({ error: "Longitude must be between -180 and 180." });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // ── Update the core User row ──
        await conn.query(
            "UPDATE User SET name = ?, email = ?, phone_number = ? WHERE user_id = ?",
            [name, email, phone, userId]
        );

        // ── Update the Receiver org type ──
        await conn.query(
            "UPDATE Receiver SET business_type = ?, organization_name = ? WHERE user_id = ?",
            [org_type, name, userId]
        );

        // ── Update the Address (first address linked to this user) ──
        await conn.query(
            "UPDATE Address SET street = ?, latitude = ?, longitude = ? WHERE user_id = ? LIMIT 1",
            [street, lat, lon, userId]
        );

        // ──── Log the change ────
        await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Profile Update', 'Receiver updated their profile information', userId]
        );

        await conn.commit();
        res.status(200).json({ message: "Profile updated successfully." });

    } catch (err) {
        await conn.rollback();
        console.error("Profile PUT error:", err);
        res.status(500).json({ error: "Failed to update profile." });
    } finally {
        conn.release();
    }
});


// =====================================================================
// ──── PUT /api/receiver/change-password/:userId (Change Password)────
//
//  Verifies the user's current password with bcrypt, then
//  hashes and stores the new password.
//
//  Password rules (same as registration):
//  • Minimum 3 characters
//  • Maximum 10 characters
// =====================================================================
app.put("/api/receiver/change-password/:userId", async (req, res) => {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    // ── Validate new password length ──
    if (!newPassword || newPassword.length < 3 || newPassword.length > 10) {
        return res.status(400).json({
            error: "New password must be between 3 and 10 characters long."
        });
    }

    try {
        // ── Fetch the stored hash ──
        const [[user]] = await pool.query(
            "SELECT password FROM User WHERE user_id = ?",
            [userId]
        );

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        // ──── Verify the current password matches the stored hash ────
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Current password is incorrect." });
        }

        // ── Hash the new password ──
        const newHash = await bcrypt.hash(newPassword, 10);

        // ── Store the new hash ──
        await pool.query(
            "UPDATE User SET password = ? WHERE user_id = ?",
            [newHash, userId]
        );

        // ── Log the action for audit trail ──
        await pool.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Password Change', 'Receiver changed their password', userId]
        );

        res.status(200).json({ message: "Password changed successfully." });

    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ error: "Failed to change password." });
    }
});


// ==============================================================
// ──── UPLOAD / DELETE PROFILE PICTURE (RECEIVER) ──────────────
// ==============================================================

app.post("/api/receiver/upload-profile-picture/:userId", upload.single("profilePicture"), async (req, res) => {
    const { userId } = req.params;
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    try {
        await pool.query(
            "UPDATE User SET profile_picture = ? WHERE user_id = ?",
            [imageUrl, userId]
        );

        // Insert notification for the receiver
        await pool.query(
            `INSERT INTO Notifications (message_title, message, type, user_id)
            VALUES (?, ?, ?, ?)`,
            [
                'Profile Picture Updated',
                'Your profile picture has been successfully changed.',
                'profile_update',
                userId
            ]
        );

        res.status(200).json({ profile_picture: imageUrl });
    } catch (err) {
        console.error("Upload profile picture error:", err);
        res.status(500).json({ error: "Failed to save profile picture." });
    }
});

// Delete profile picture
app.delete("/api/receiver/delete-profile-picture/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        // Get current picture to delete file from disk
        const [[user]] = await pool.query(
            "SELECT profile_picture FROM User WHERE user_id = ?",
            [userId]
        );
        if (user && user.profile_picture) {
            const filePath = path.join(__dirname, user.profile_picture);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await pool.query(
            "UPDATE User SET profile_picture = NULL WHERE user_id = ?",
            [userId]
        );

        // Insert notification for the receiver
        await pool.query(
            `INSERT INTO Notifications (message_title, message, type, user_id)
            VALUES (?, ?, ?, ?)`,
            [
                'Profile Picture Deleted',
                'Your profile picture has been removed.',
                'profile_update',
                userId
            ]
        );

        res.status(200).json({ message: "Profile picture deleted." });
    } catch (err) {
        console.error("Delete profile picture error:", err);
        res.status(500).json({ error: "Failed to delete profile picture." });
    }
});


// ==============================================================
// ──────────────── RECEIVER Browse Offers API (with images) ────
// ==============================================================

// Returns ALL available food offers including the first image URL
app.get("/api/offers", async (req, res) => {
    try {
        const [offers] = await pool.query(`
            SELECT
                fo.offer_id,
                fo.food_name,
                fo.description,
                fo.number_of_person,
                fo.quantity_by_kg,
                fo.expiration_date_and_time,
                fo.created_at,
                u.name AS donor_name,
                a.street,
                a.city,
                fc.category_name,
                fc.category_id,
                -- Get the first image URL (oldest photo_id) for this offer
                (
                    SELECT fp.image_url
                    FROM Food_photo fp
                    WHERE fp.offer_id = fo.offer_id
                    ORDER BY fp.photo_id ASC
                    LIMIT 1
                ) AS image_url
            FROM Food_offer fo
            JOIN Donor d ON d.donor_id = fo.donor_id
            JOIN User u ON u.user_id = d.user_id
            JOIN Address a ON a.address_id = d.address_id
            JOIN Food_category fc ON fc.category_id = fo.category_id
            WHERE fo.status = 'available'
              -- Hide offers whose expiration has already passed even if a cron
              -- run hasn't flipped them to 'expired' yet.
              AND (fo.expiration_date_and_time IS NULL
                   OR fo.expiration_date_and_time > NOW())
            ORDER BY
                -- Urgency bucket: 0 = expires within 48h, 1 = everyone else
                CASE
                    WHEN fo.expiration_date_and_time IS NOT NULL
                     AND fo.expiration_date_and_time <= DATE_ADD(NOW(), INTERVAL 48 HOUR)
                    THEN 0 ELSE 1
                END,
                -- Within the urgent bucket: soonest expiry first.
                -- Non-urgent rows return NULL here and fall through to offer_id.
                CASE
                    WHEN fo.expiration_date_and_time IS NOT NULL
                     AND fo.expiration_date_and_time <= DATE_ADD(NOW(), INTERVAL 48 HOUR)
                    THEN fo.expiration_date_and_time
                END ASC,
                fo.offer_id DESC
        `);

        res.status(200).json(offers);
    } catch (err) {
        console.error("Fetch offers error:", err);
        res.status(500).json({ error: "Failed to fetch offers." });
    }
});




// ──── Get all food categories (for dynamic filter dropdown) ────
app.get("/api/categories", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT category_id, category_name, description FROM Food_category ORDER BY category_name"
        );
        res.status(200).json(rows);
    } catch (err) {
        console.error("Fetch categories error:", err);
        res.status(500).json({ error: "Failed to load categories." });
    }
});



// ==============================================================
// ──── GET /api/offers/:offerId  (Offer Detail Page) ───────────
//
//  Returns the FULL detail of a single food offer by its ID.
//  Includes fields NOT returned by the list endpoint:
//    • pickup_time
//    • dietary_information
//    • status (so the UI can show Available / Accepted / etc.)
//    • posted_on (offer_id's row creation — approximated via offer_id ordering)
//  This route is NEW — it does NOT duplicate /api/offers.
// ==============================================================
app.get("/api/offers/:offerId", async (req, res) => {
    const { offerId } = req.params;

    try {
        const [[offer]] = await pool.query(`
            SELECT
                fo.offer_id,
                fo.food_name,
                fo.description,
                fo.number_of_person,
                fo.quantity_by_kg,
                fo.expiration_date_and_time,
                fo.pickup_time,
                fo.dietary_information,
                fo.status,

                u.name  AS donor_name,

                a.street,
                a.city,
                a.country,

                fc.category_id,
                fc.category_name

            FROM Food_offer fo

            JOIN Donor         d  ON d.donor_id    = fo.donor_id
            JOIN User          u  ON u.user_id      = d.user_id
            JOIN Address       a  ON a.address_id   = d.address_id
            JOIN Food_category fc ON fc.category_id = fo.category_id

            WHERE fo.offer_id = ?
        `, [offerId]);

        if (!offer) {
            return res.status(404).json({ error: "Offer not found." });
        }

        res.status(200).json(offer);

    } catch (err) {
        console.error("Fetch offer detail error:", err);
        res.status(500).json({ error: "Failed to fetch offer details." });
    }
});




// ==============================================================
// ──────────────── RECEIVER ACCEPTED OFFERS API ────────────────
// ==============================================================

// ──── 12. Get all accepted offers for a receiver ────
app.get("/api/receiver/accepted-offers/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const [[receiver]] = await pool.query(
            "SELECT receiver_id FROM Receiver WHERE user_id = ?",
            [userId]
        );
        if (!receiver) return res.status(404).json({ error: "Receiver not found." });

        const receiverId = receiver.receiver_id;

        const [offers] = await pool.query(`
            SELECT
                fo.offer_id,
                fo.food_name                 AS title,
                fo.quantity_by_kg,
                fo.number_of_person,
                fo.status,
                fo.pickup_time,
                u.name                       AS donor_name,
                d.donor_id,
                -- Volunteer info (if delivery completed)
                vu.name                      AS volunteer_name,
                del.volunteer_id,
                del.delivery_id
            FROM Food_offer fo
            JOIN Donor d ON d.donor_id = fo.donor_id
            JOIN User  u ON u.user_id  = d.user_id
            LEFT JOIN Delivery del ON del.offer_id = fo.offer_id AND del.delivery_status = 'completed'
            LEFT JOIN Volunteer v ON v.volunteer_id = del.volunteer_id
            LEFT JOIN User vu ON vu.user_id = v.user_id
            WHERE fo.receiver_id = ? AND fo.status = 'accepted'
            ORDER BY fo.offer_id DESC
        `, [receiverId]);

        res.status(200).json(offers);
    } catch (err) {
        console.error("Fetch accepted offers error:", err);
        res.status(500).json({ error: "Failed to load accepted offers." });
    }
});




// ──── 13. Cancel an accepted offer ────
app.post("/api/receiver/cancel-offer", async (req, res) => {
    const { offerId, userId } = req.body;

    if (!offerId || !userId) {
        return res.status(400).json({ error: "Offer ID and User ID are required." });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Get receiver_id from Receiver table
        const [[receiver]] = await conn.query(
            "SELECT receiver_id FROM Receiver WHERE user_id = ?",
            [userId]
        );
        if (!receiver) {
            await conn.rollback();
            return res.status(404).json({ error: "Receiver not found." });
        }
        const correctReceiverId = receiver.receiver_id;

        // Check offer exists and is accepted
        const [[offer]] = await conn.query(
            "SELECT offer_id, status, receiver_id, food_name FROM Food_offer WHERE offer_id = ?",
            [offerId]
        );
        if (!offer) {
            await conn.rollback();
            return res.status(404).json({ error: "Offer not found." });
        }
        if (offer.status !== 'accepted') {
            await conn.rollback();
            return res.status(400).json({ error: `Offer cannot be cancelled because its status is '${offer.status}'.` });
        }
        if (offer.receiver_id !== correctReceiverId) {
            await conn.rollback();
            return res.status(403).json({ error: "You are not authorized to cancel this offer." });
        }

        // Perform cancellation: make offer available again (keep receiver_id)
        const [result] = await conn.query(
            `UPDATE Food_offer
            SET status = 'available'
            WHERE offer_id = ? AND receiver_id = ? AND status = 'accepted'`,
            [offerId, correctReceiverId]
        );

        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(400).json({ error: "Failed to cancel offer. No rows affected." });
        }

        // Notify the donor
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role)
            SELECT 'Offer Cancelled', CONCAT('The receiver has cancelled the offer: ', ?, '. It is now available again.'), 'cancellation', u.user_id, 'Donor'
            FROM Food_offer fo
            JOIN Donor d ON d.donor_id = fo.donor_id
            JOIN User u ON u.user_id = d.user_id
            WHERE fo.offer_id = ?`,
            [offer.food_name, offerId]
        );

        // Notify the receiver
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role)
            VALUES ('Offer Cancelled', 'You have cancelled an offer. The donor has been notified, and the offer is now available for others.', 'cancellation', ?, 'Receiver')`,
            [userId]
        );

        // ── ADMIN NOTIFICATION: offer cancelled ──
        // Get donor name for better context
        const [[donorInfo]] = await conn.query(`
            SELECT u.name AS donor_name FROM Donor d
            JOIN User u ON d.user_id = u.user_id
            WHERE d.donor_id = (SELECT donor_id FROM Food_offer WHERE offer_id = ?)
        `, [offerId]);

        await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Cancel Offer', `Receiver cancelled offer ID ${offerId}`, userId]
        );

        const donorName = donorInfo ? donorInfo.donor_name : 'Unknown donor';

        // Notify the admin
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
            VALUES (?, ?, ?, NULL, NOW())`,
            [
                'Offer Cancelled',
                `Receiver cancelled offer "${offer.food_name}" (originally from ${donorName}).`,
                'offer_cancelled'
            ]
        );


        await conn.commit();
        res.status(200).json({ message: "Offer cancelled successfully and is now available again." });
    } catch (err) {
        await conn.rollback();
        console.error("Cancel offer error:", err);
        res.status(500).json({ error: "Failed to cancel offer: " + err.message });
    } finally {
        conn.release();
    }
});


// ──── 14. Give feedback on an accepted offer ────
app.post("/api/receiver/feedback-offer", async (req, res) => {
    const { offerId, userId, donorRating, volunteerRating, comment } = req.body;

    if (!offerId || !userId || !donorRating || !volunteerRating) {
        return res.status(400).json({ error: "Offer ID, User ID, donor rating and volunteer rating are required." });
    }
    if (donorRating < 1 || donorRating > 5 || volunteerRating < 1 || volunteerRating > 5) {
        return res.status(400).json({ error: "Ratings must be between 1 and 5." });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Get receiver_id, donor_id, and the completed delivery for this offer
        //    (Accept both legacy 'accepted'/'completed' and new 'delivered' status values)
        const [[offer]] = await conn.query(
            `SELECT receiver_id, donor_id FROM Food_offer
             WHERE offer_id = ? AND status IN ('accepted', 'delivered')`,
            [offerId]
        );
        if (!offer) {
            await conn.rollback();
            return res.status(404).json({ error: "Accepted offer not found." });
        }

        const [[delivery]] = await conn.query(
            `SELECT delivery_id, volunteer_id FROM Delivery
             WHERE offer_id = ? AND delivery_status IN ('completed', 'delivered')
             ORDER BY delivery_id DESC LIMIT 1`,
            [offerId]
        );
        if (!delivery) {
            await conn.rollback();
            return res.status(404).json({ error: "No completed delivery found for this offer." });
        }

        const today = new Date().toISOString().slice(0, 10);

        // 2. Insert donor rating (volunteer_id = NULL)
        await conn.query(
            `INSERT INTO Feedback_and_rating
             (rating, comment, feedback_date, given_by, donor_id, volunteer_id, receiver_id, delivery_id)
             VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
            [donorRating, comment || null, today, userId, offer.donor_id, offer.receiver_id, delivery.delivery_id]
        );

        // 3. Insert volunteer rating (donor_id = NULL)
        await conn.query(
            `INSERT INTO Feedback_and_rating
             (rating, comment, feedback_date, given_by, donor_id, volunteer_id, receiver_id, delivery_id)
             VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
            [volunteerRating, comment || null, today, userId, delivery.volunteer_id, offer.receiver_id, delivery.delivery_id]
        );

        // ── ADMIN NOTIFICATION: feedback submitted ──
        // Fetch receiver name for the notification
        const [[receiverUser]] = await conn.query(
            `SELECT u.name FROM User u WHERE u.user_id = ?`,
            [userId]
        );
        const receiverName = receiverUser ? receiverUser.name : 'A receiver';

        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
            VALUES (?, ?, ?, NULL, NOW())`,
            [
                'Feedback Submitted',
                `Receiver "${receiverName}" rated donor ${donorRating}/5 and volunteer ${volunteerRating}/5 for offer #${offerId}. Comment: "${comment || 'No comment'}"`,
                'feedback_submitted'
            ]
        );

        // Notify the rated donor
        const [[donorTarget]] = await conn.query(
            `SELECT u.user_id, fo.food_name
             FROM Donor d
             JOIN User u ON u.user_id = d.user_id
             JOIN Food_offer fo ON fo.donor_id = d.donor_id
             WHERE d.donor_id = ? AND fo.offer_id = ?`,
            [offer.donor_id, offerId]
        );
        if (donorTarget) {
            await conn.query(
                `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
                 VALUES (?, ?, ?, ?, 'Donor', NOW())`,
                ['New Feedback Received',
                    `${receiverName} rated your donation "${donorTarget.food_name}" ${donorRating}/5.`,
                    'feedback_received', donorTarget.user_id]
            );
        }

        // Notify the rated volunteer
        const [[volTarget]] = await conn.query(
            `SELECT u.user_id FROM Volunteer v
             JOIN User u ON u.user_id = v.user_id
             WHERE v.volunteer_id = ?`,
            [delivery.volunteer_id]
        );
        if (volTarget) {
            await conn.query(
                `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
                 VALUES (?, ?, ?, ?, 'Volunteer', NOW())`,
                ['New Feedback Received',
                    `${receiverName} rated your delivery ${volunteerRating}/5.`,
                    'feedback_received', volTarget.user_id]
            );
        }

        await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Feedback', `Receiver gave donor rating ${donorRating} and volunteer rating ${volunteerRating} for offer ID ${offerId}`, userId]
        );

        await conn.commit();
        res.status(200).json({ message: "Thank you for your feedback!" });
    } catch (err) {
        await conn.rollback();
        console.error("Feedback error:", err);
        res.status(500).json({ error: "Failed to submit feedback." });
    } finally {
        conn.release();
    }
});





// ==============================================================
// ──────────────── RECEIVER HISTORY API ────────────────────────
// ==============================================================
// ──── 15. Get Receiver History (completed deliveries) ────
// Returns list of past received donations with donor info, quantity, delivered date,
// and a flag indicating whether feedback has already been given.
app.get("/api/receiver/history/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const [[receiver]] = await pool.query(
            "SELECT receiver_id FROM Receiver WHERE user_id = ?",
            [userId]
        );
        if (!receiver) {
            return res.status(404).json({ error: "Receiver not found." });
        }
        const receiverId = receiver.receiver_id;

        // History now includes any offer that has progressed past receiver-acceptance
        // (i.e. a volunteer has taken it), so that as soon as a volunteer accepts
        // the offer it disappears from "My Accepted" and shows up here.
        const [history] = await pool.query(`
            SELECT
                fo.offer_id,
                fo.food_name                     AS title,
                fo.quantity_by_kg,
                fo.number_of_person,
                u.name                           AS donor_name,
                d.donor_id,
                del.delivery_id,
                del.delivery_status,
                del.delivery_time                AS delivered_date,
                del.pickup_time                  AS pickup_time,
                u_vol.name                       AS volunteer_name,
                EXISTS(
                    SELECT 1 FROM Feedback_and_rating fr
                    WHERE fr.delivery_id = del.delivery_id
                      AND fr.given_by = ?
                ) AS feedback_given
            FROM Delivery del
            JOIN Food_offer fo ON fo.offer_id = del.offer_id
            JOIN Donor d       ON d.donor_id  = fo.donor_id
            JOIN User u        ON u.user_id   = d.user_id
            LEFT JOIN Volunteer vol ON vol.volunteer_id = del.volunteer_id
            LEFT JOIN User u_vol    ON u_vol.user_id    = vol.user_id
            WHERE fo.receiver_id = ?
              AND del.delivery_status IN ('delivery_accepted', 'in_delivery', 'delivered', 'completed')
            ORDER BY
                CASE del.delivery_status
                    WHEN 'delivery_accepted' THEN 1
                    WHEN 'in_delivery'       THEN 2
                    WHEN 'delivered'         THEN 3
                    WHEN 'completed'         THEN 4
                    ELSE 5
                END,
                COALESCE(del.delivery_time, del.pickup_time) DESC,
                del.delivery_id DESC
        `, [userId, receiverId]);

        const formattedHistory = history.map(row => ({
            ...row,
            quantity: row.quantity_by_kg ? `${row.quantity_by_kg} kg` : (row.number_of_person ? `${row.number_of_person} portions` : '—'),
            delivered_date: row.delivered_date ? new Date(row.delivered_date).toLocaleString() : '—'
        }));

        res.status(200).json(formattedHistory);
    } catch (err) {
        console.error("Fetch history error:", err);
        res.status(500).json({ error: "Failed to load receiving history." });
    }
});



// ==============================================================
// ──────────────── RECEIVER NOTIFICATIONS API ──────────────────
// ==============================================================

// ──── 16. Get all notifications for a receiver ─────────────────────
// Returns all notifications for the user, ordered by date DESC.
// This is a new endpoint because the dashboard only returns the latest 10.
app.get("/api/receiver/notifications/:userId", async (req, res) => {
    const { userId } = req.params;
    const { status } = req.query; // 'all' (default) or 'unread'

    try {
        // Filter so dual-role users only see their Receiver-side stream.
        let query = `
            SELECT
                notification_id,
                message_title AS title,
                message,
                type,
                read_at,
                date
            FROM Notifications
            WHERE user_id = ?
              AND (recipient_role IS NULL OR recipient_role = 'Receiver')
        `;
        const params = [userId];

        if (status === 'unread') {
            query += ` AND read_at IS NULL`;
        }

        query += ` ORDER BY date DESC`;

        const [notifications] = await pool.query(query, params);
        res.status(200).json(notifications);
    } catch (err) {
        console.error("Fetch notifications error:", err);
        res.status(500).json({ error: "Failed to load notifications." });
    }
});

// ──── 17. Mark all notifications as read for a receiver ──────────────
// Sets read_at = NOW() for all unread notifications of this user.
// This is a new convenience endpoint to avoid multiple PATCH requests.
app.post("/api/receiver/notifications/mark-all-read/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const [result] = await pool.query(
            `UPDATE Notifications
            SET read_at = NOW()
            WHERE user_id = ? AND read_at IS NULL`,
            [userId]
        );

        res.status(200).json({
            message: `${result.affectedRows} notification(s) marked as read.`
        });
    } catch (err) {
        console.error("Mark all read error:", err);
        res.status(500).json({ error: "Failed to mark notifications as read." });
    }
});


// ──── 18. Mark a single notification as read ──────────────────
// Sets read_at = NOW() for the given notification, only if it belongs to the user.
// Also verifies the user owns this notification via user_id (passed in body).
app.patch("/api/receiver/notifications/:notificationId/read", async (req, res) => {
    const { notificationId } = req.params;
    const { userId } = req.body;   // We need userId to ensure ownership

    if (!userId) {
        return res.status(400).json({ error: "User ID is required." });
    }

    try {
        // Verify the notification belongs to this user and is currently unread
        const [notif] = await pool.query(
            `SELECT notification_id FROM Notifications
            WHERE notification_id = ? AND user_id = ? AND read_at IS NULL`,
            [notificationId, userId]
        );

        if (notif.length === 0) {
            return res.status(404).json({ error: "Notification not found, already read, or does not belong to you." });
        }

        // Mark as read
        await pool.query(
            `UPDATE Notifications SET read_at = NOW()
            WHERE notification_id = ?`,
            [notificationId]
        );

        res.status(200).json({ message: "Notification marked as read." });
    } catch (err) {
        console.error("Mark as read error:", err);
        res.status(500).json({ error: "Failed to mark notification as read." });
    }
});

// ──── 19. Delete all notifications for a user ─────────────────
// Removes every notification row belonging to this user.
app.delete("/api/receiver/notifications/clear/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        // Optional: count how many will be deleted
        const [countResult] = await pool.query(
            "SELECT COUNT(*) AS total FROM Notifications WHERE user_id = ?",
            [userId]
        );
        const total = countResult[0].total;

        // Delete all notifications for this user
        const [result] = await pool.query(
            "DELETE FROM Notifications WHERE user_id = ?",
            [userId]
        );

        res.status(200).json({
            message: `${result.affectedRows} notification(s) deleted.`,
            deletedCount: result.affectedRows
        });
    } catch (err) {
        console.error("Delete all notifications error:", err);
        res.status(500).json({ error: "Failed to delete notifications." });
    }
});


// ──── 20. Delete a single notification ─────────────────────
app.delete("/api/receiver/notifications/:notificationId", async (req, res) => {
    const { notificationId } = req.params;
    const { userId } = req.body;   // userId must be sent in body for security

    if (!userId) {
        return res.status(400).json({ error: "User ID is required." });
    }

    try {
        // Verify the notification belongs to this user
        const [notif] = await pool.query(
            "SELECT notification_id FROM Notifications WHERE notification_id = ? AND user_id = ?",
            [notificationId, userId]
        );

        if (notif.length === 0) {
            return res.status(404).json({ error: "Notification not found or does not belong to you." });
        }

        // Delete it
        await pool.query(
            "DELETE FROM Notifications WHERE notification_id = ?",
            [notificationId]
        );

        res.status(200).json({ message: "Notification deleted successfully." });
    } catch (err) {
        console.error("Delete notification error:", err);
        res.status(500).json({ error: "Failed to delete notification." });
    }
});

// ──── 21. Get unread notification count for a receiver ────
app.get("/api/receiver/notifications/unread-count/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const [[{ count }]] = await pool.query(
            `SELECT COUNT(*) AS count FROM Notifications
             WHERE user_id = ?
               AND read_at IS NULL
               AND (recipient_role IS NULL OR recipient_role = 'Receiver')`,
            [userId]
        );
        res.json({ count });
    } catch (err) {
        console.error("Unread count error:", err);
        res.status(500).json({ error: "Failed to get unread count." });
    }
});





// ────────────────────────────── Donor ──────────────────────────────────

// ==============================================================
// ──────────────── DONOR DASHBOARD API ─────────────────────────
// ==============================================================

app.get("/api/donor/dashboard/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        // 1. Get Organization Name
        const [donors] = await pool.query("SELECT donor_id, organization_name FROM Donor WHERE user_id = ?", [userId]);
        if (donors.length === 0) return res.status(404).json({ error: "Donor profile not found" });
        const donorId = donors[0].donor_id;

        // 2. Aggregate Stats
        // Active: Everything EXCEPT Delivered or Cancelled
        const [[{ active }]] = await pool.query("SELECT COUNT(*) as active FROM Food_offer WHERE donor_id = ? AND status NOT IN ('delivered', 'cancelled')", [donorId]);

        // Pending: Status is 'accepted' but not yet 'delivered'
        const [[{ pending }]] = await pool.query("SELECT COUNT(*) as pending FROM Food_offer WHERE donor_id = ? AND status = 'accepted'", [donorId]);

        // Completed: Status is 'delivered'
        const [[{ completed }]] = await pool.query("SELECT COUNT(*) as completed FROM Food_offer WHERE donor_id = ? AND status = 'delivered'", [donorId]);

        // Impact: SUM of persons and kg
        const [[impact]] = await pool.query(
            "SELECT SUM(number_of_person) as fed, SUM(quantity_by_kg) as kg FROM Food_offer WHERE donor_id = ? AND status = 'delivered'",
            [donorId]
        );

        // 3. Recent Offers — fetch up to 5 so the dashboard's Recent Offers
        // card fills the available column space without leaving a big gap
        // above the donut chart below it.
        const [recent] = await pool.query(
            "SELECT offer_id, food_name, status, number_of_person, created_at FROM Food_offer WHERE donor_id = ? ORDER BY created_at DESC LIMIT 5",
            [donorId]
        );

        // 4. Notifications
        const [notifs] = await pool.query(
            `SELECT * FROM Notifications WHERE user_id = ? ORDER BY (read_at IS NULL) DESC, date DESC LIMIT 3`,
            [userId]
        );

        // 5. Status breakdown — count of offers grouped by status (powers the donut chart)
        const [statusRows] = await pool.query(
            `SELECT COALESCE(status, 'unknown') AS status, COUNT(*) AS count
             FROM Food_offer
             WHERE donor_id = ?
             GROUP BY status
             ORDER BY count DESC`,
            [donorId]
        );

        res.json({
            organizationName: donors[0].organization_name,
            stats: {
                activeOffers: active,
                pendingPickups: pending,
                completedDonations: completed,
                peopleFed: impact.fed || 0,
                totalKg: impact.kg || 0
            },
            recentOffers: recent,
            notifications: notifs,
            unreadCount: notifs.length, // Simplified for now
            statusBreakdown: statusRows.map(r => ({ status: r.status, count: Number(r.count) }))
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// ==============================================================
// ──── GET /api/donor/profile/:userId ──────────────────────────
//
//  Returns donor profile + stats: totalDonations, peopleFed, co2Prevented
// ==============================================================
app.get("/api/donor/profile/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const [rows] = await pool.query(`
            SELECT
                u.user_id,
                u.name,
                u.email,
                u.phone_number,
                u.profile_picture,
                u.created_at, -- Pulls the registration date
                d.donor_id,
                d.organization_name AS business_name,
                d.business_type,
                a.street,
                a.city,
                a.country,
                a.latitude,
                a.longitude
            FROM User u
            JOIN Donor d ON d.user_id = u.user_id
            LEFT JOIN Address a ON a.user_id = u.user_id
            WHERE u.user_id = ?
            LIMIT 1
        `, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Donor profile not found." });
        }

        const profile = rows[0];

        // Basic Stats
        const [[{ totalDonations }]] = await pool.query(
            "SELECT COUNT(*) AS totalDonations FROM Food_offer WHERE donor_id = ?",
            [profile.donor_id]
        );

        const [[{ peopleFed }]] = await pool.query(
            `SELECT COALESCE(SUM(number_of_person), 0) AS peopleFed
             FROM Food_offer
             WHERE donor_id = ? AND status IN ('accepted', 'completed', 'picked_up', 'in_transit')`,
            [profile.donor_id]
        );

        res.json({
            profile,
            stats: {
                totalDonations: Number(totalDonations),
                peopleFed: Number(peopleFed)
            }
        });

    } catch (err) {
        console.error("Donor profile GET error:", err);
        res.status(500).json({ error: "Failed to load donor profile." });
    }
});
// ==============================================================
// ──── PUT /api/donor/profile/:userId ──────────────────────────
//
//  Updates: User.name, User.email, User.phone_number
//           Address.street (first address linked to this donor)
//           Donor.business_type
//
//  Request body: { name, email, phone, street, business_type }
// ==============================================================
app.put("/api/donor/profile/:userId", async (req, res) => {
    const { userId } = req.params;
    const { name, email, phone, street, city, business_type, latitude, longitude } = req.body;

    if (!name || !email || !phone || !street || !city || !business_type) {
        return res.status(400).json({ error: "All fields except country are required." });
    }

    // Sanitize lat/lon — optional, but validated against valid ranges if provided
    const lat = (latitude !== '' && latitude !== null && latitude !== undefined && !isNaN(parseFloat(latitude)))
        ? parseFloat(latitude) : null;
    const lon = (longitude !== '' && longitude !== null && longitude !== undefined && !isNaN(parseFloat(longitude)))
        ? parseFloat(longitude) : null;

    if (lat !== null && (lat < -90 || lat > 90)) {
        return res.status(400).json({ error: "Latitude must be between -90 and 90." });
    }
    if (lon !== null && (lon < -180 || lon > 180)) {
        return res.status(400).json({ error: "Longitude must be between -180 and 180." });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Update User table - Use conn
        await conn.query(
            "UPDATE User SET name = ?, email = ?, phone_number = ? WHERE user_id = ?",
            [name, email, phone, userId]
        );

        // 2. Update Donor - Use conn
        await conn.query(
            "UPDATE Donor SET organization_name = ?, business_type = ? WHERE user_id = ?",
            [name, business_type, userId]
        );

        // 3. Handle Address - Use conn
        const [addr] = await conn.query(
            "SELECT address_id FROM Address WHERE user_id = ? LIMIT 1",
            [userId]
        );

        if (addr.length === 0) {
            const DEFAULT_COUNTRY = 'Lebanon';
            await conn.query(
                "INSERT INTO Address (user_id, street, city, country, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)",
                [userId, street, city, DEFAULT_COUNTRY, lat, lon]
            );
        } else {
            await conn.query(
                "UPDATE Address SET street = ?, city = ?, latitude = ?, longitude = ? WHERE user_id = ?",
                [street, city, lat, lon, userId]
            );
        }

        // 4. Log the change - FIXED: Changed pool.query to conn.query
        // This was likely the cause of your lock timeout.
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, ?, NOW())`,
            [
                'Profile Update Successful',
                'Your profile information has been successfully updated in our system.',
                'account',
                userId
            ]
        );

        await conn.commit();
        res.status(200).json({ message: "Profile updated successfully." });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Donor profile PUT error:", err);
        res.status(500).json({ error: "Failed to update donor profile." });
    } finally {
        if (conn) conn.release();
    }
});

// Upload Donor Profile Picture
app.post("/api/donor/upload-profile-picture/:userId", upload.single("profilePicture"), async (req, res) => {
    const { userId } = req.params;
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    try {
        // Update the User table
        await pool.query(
            "UPDATE User SET profile_picture = ? WHERE user_id = ?",
            [imageUrl, userId]
        );

        // Add Notification
        await pool.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, ?, NOW())`,
            [
                'Profile Picture Updated',
                'Your donor profile picture has been successfully changed.',
                'profile_update',
                userId
            ]
        );

        res.status(200).json({ profile_picture: imageUrl });
    } catch (err) {
        console.error("Donor upload error:", err);
        res.status(500).json({ error: "Failed to save donor profile picture." });
    }
});

// Delete Donor Profile Picture
app.delete("/api/donor/delete-profile-picture/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const [[user]] = await pool.query(
            "SELECT profile_picture FROM User WHERE user_id = ?",
            [userId]
        );

        if (user && user.profile_picture) {
            const filePath = path.join(__dirname, user.profile_picture);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await pool.query(
            "UPDATE User SET profile_picture = NULL WHERE user_id = ?",
            [userId]
        );

        // Add Notification
        await pool.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, ?, NOW())`,
            [
                'Profile Picture Removed',
                'Your profile picture has been removed from your account.',
                'profile_update',
                userId
            ]
        );

        res.status(200).json({ message: "Profile picture deleted." });
    } catch (err) {
        console.error("Donor delete error:", err);
        res.status(500).json({ error: "Failed to delete donor profile picture." });
    }
});

// ==============================================================
// ──── PUT /api/donor/change-password/:userId ──────────────────
//
//  Verifies current password, hashes and stores new password.
//  Request body: { currentPassword, newPassword }
// ==============================================================
app.put("/api/donor/change-password/:userId", async (req, res) => {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 3 || newPassword.length > 10) {
        return res.status(400).json({ error: "New password must be between 3 and 10 characters." });
    }

    try {
        const [[user]] = await pool.query("SELECT password FROM User WHERE user_id = ?", [userId]);
        if (!user) return res.status(404).json({ error: "User not found." });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ error: "Current password is incorrect." });

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE User SET password = ? WHERE user_id = ?", [newHash, userId]);

        // Log to Syslog
        await pool.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Password Change', 'Donor changed their password', userId]
        );

        // Add Notification
        await pool.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, ?, NOW())`,
            [
                'Security Alert: Password Changed',
                'The password for your FeedHope account was recently updated. If this wasn\'t you, contact support.',
                'security',
                userId
            ]
        );

        res.status(200).json({ message: "Password changed successfully." });
    } catch (err) {
        console.error("Donor change password error:", err);
        res.status(500).json({ error: "Failed to change password." });
    }
});

// 1. GET - Fetch donor's offers (with optional status filter)
app.get('/api/donor/my-offers/:userId', async (req, res) => {
    const { userId } = req.params;
    const { status } = req.query;

    try {
        // 1. Get donor_id from the logged‑in user_id
        const [donorRows] = await pool.query(
            "SELECT donor_id FROM Donor WHERE user_id = ?",
            [userId]
        );
        if (donorRows.length === 0) {
            return res.status(404).json({ error: "Donor profile not found for this user." });
        }
        const donorId = donorRows[0].donor_id;

        // 2. Build the dynamic query
        let query = `
            SELECT
                o.offer_id,
                o.food_name,
                c.category_name,
                o.category_id,
                o.quantity_by_kg,
                o.status,
                o.description,
                o.dietary_information,
                o.number_of_person,
                o.expiration_date_and_time,
                o.pickup_time,
                o.created_at
            FROM food_offer o
            LEFT JOIN food_category c ON o.category_id = c.category_id
            WHERE o.donor_id = ?
        `;
        const params = [donorId];

        if (status && status !== 'All') {
            // Convert frontend status (e.g. "In_delivery") to DB format ("in_delivery")
            const dbStatus = status.toLowerCase();
            query += " AND LOWER(o.status) = ?";
            params.push(dbStatus);
        }

        query += " ORDER BY o.created_at DESC";

        const [offers] = await pool.query(query, params);
        res.json(offers);
    } catch (error) {
        console.error('SQL ERROR:', error.message);
        res.status(500).json({ error: error.message });
    }
});


// 2. GET - Fetch single offer details for editing
app.get('/api/donor/offer/:offerId', async (req, res) => {
    const { offerId } = req.params;

    try {
        const [rows] = await pool.query(
            `SELECT
                o.offer_id,
                o.food_name,
                o.description,
                o.dietary_information,
                o.quantity_by_kg,
                o.number_of_person,
                o.expiration_date_and_time,
                o.pickup_time,
                o.status,
                o.category_id,
                c.category_name,
                o.donor_id,
                o.created_at
            FROM food_offer o
            LEFT JOIN food_category c ON o.category_id = c.category_id
            WHERE o.offer_id = ?`,
            [offerId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        res.json({
            success: true,
            offer: rows[0]
        });
    } catch (error) {
        console.error('SQL ERROR:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 3. PUT - Update offer information
app.put('/api/donor/edit-offer/:offerId', async (req, res) => {
    const { offerId } = req.params;
    const {
        food_name,
        description,
        dietary_information,
        quantity_by_kg,
        number_of_person,
        expiration_date_and_time,
        pickup_time,
        category_id
    } = req.body;

    // Validate required fields
    if (!food_name || !category_id) {
        return res.status(400).json({
            success: false,
            message: 'Food name and category are required'
        });
    }

    try {
        // Check if offer exists and belongs to the donor
        const [checkResult] = await pool.query(
            'SELECT * FROM food_offer WHERE offer_id = ?',
            [offerId]
        );

        if (checkResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        // Update the offer
        const [result] = await pool.query(
            `UPDATE food_offer
             SET food_name = ?,
                 description = ?,
                 dietary_information = ?,
                 quantity_by_kg = ?,
                 number_of_person = ?,
                 expiration_date_and_time = ?,
                 pickup_time = ?,
                 category_id = ?
             WHERE offer_id = ?`,
            [
                food_name,
                description,
                dietary_information,
                quantity_by_kg,
                number_of_person,
                expiration_date_and_time,
                pickup_time,
                category_id,
                offerId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found or no changes made'
            });
        }

        // Fetch the updated offer with category name
        const [updatedRows] = await pool.query(
            `SELECT
                o.offer_id,
                o.food_name,
                o.description,
                o.dietary_information,
                o.quantity_by_kg,
                o.number_of_person,
                o.expiration_date_and_time,
                o.pickup_time,
                o.status,
                o.category_id,
                c.category_name,
                o.donor_id,
                o.created_at
             FROM food_offer o
             LEFT JOIN food_category c ON o.category_id = c.category_id
             WHERE o.offer_id = ?`,
            [offerId]
        );

        res.json({
            success: true,
            message: 'Offer updated successfully',
            offer: updatedRows[0]
        });

    } catch (error) {
        console.error('SQL ERROR:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// GET Donor Delivered History
// 🛠 Fixed: param is the User.user_id (front-end sends user.user_id);
//    we look up the donor_id from the Donor table. Status is stored
//    lowercase ('delivered'), not 'Delivered'. Rating is restricted
//    to the donor-targeted feedback row only.
app.get('/api/donor/history/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [[donorRow]] = await pool.query(
            'SELECT donor_id FROM Donor WHERE user_id = ?',
            [userId]
        );
        if (!donorRow) {
            return res.status(200).json([]);
        }
        const donorId = donorRow.donor_id;

        const query = `
            SELECT
                fo.offer_id                          AS id,
                fo.food_name                         AS title,
                COALESCE(u.name, 'Organization')     AS receiver,
                COALESCE(fo.quantity_by_kg, 0)       AS quantity,
                COALESCE(fo.number_of_person, 0)     AS people_helped,
                COALESCE(MAX(fb.rating), 0)          AS rating,
                fo.status,
                MAX(d.delivery_time)                 AS delivered_at
            FROM Food_offer fo
            LEFT JOIN Receiver r ON fo.receiver_id = r.receiver_id
            LEFT JOIN User u     ON r.user_id      = u.user_id
            LEFT JOIN Delivery d ON fo.offer_id    = d.offer_id
            LEFT JOIN Feedback_and_rating fb
                   ON fb.delivery_id = d.delivery_id
                  AND fb.donor_id    = fo.donor_id
            WHERE fo.donor_id = ?
              AND LOWER(fo.status) = 'delivered'
            GROUP BY fo.offer_id
            ORDER BY MAX(d.delivery_time) DESC, fo.offer_id DESC
        `;

        const [rows] = await pool.query(query, [donorId]);
        res.json(rows);
    } catch (error) {
        console.error('Database Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch history data' });
    }
});



// ==============================================================
// ──────────────── DONOR: CREATE NEW FOOD OFFER ─────────────────
// ==============================================================

// Configure multer storage for offer images (separate subfolder recommended)
const offerUploadDir = path.join(__dirname, "uploads/offers");
if (!fs.existsSync(offerUploadDir)) {
    fs.mkdirSync(offerUploadDir, { recursive: true });
}

const offerStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, offerUploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const uploadOfferImage = multer({ storage: offerStorage, limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB


app.post("/api/donor/create-offer", uploadOfferImage.single("imageFile"), async (req, res) => {
    const {
        foodName,
        description,
        categoryId,
        quantityKg,
        numPersons,
        pickupTime,
        expirationDate,
        dietarySelections,
        userId          // from frontend (User.user_id)
    } = req.body;

    console.log("Received create-offer request with userId:", userId);

    // Basic validation
    if (!foodName || !categoryId || !quantityKg || !pickupTime || !expirationDate || !userId) {
        return res.status(400).json({ error: "Missing required fields: foodName, categoryId, quantityKg, pickupTime, expirationDate, userId" });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Get donor_id from Donor table using user_id
        const [donorRows] = await conn.query(
            "SELECT donor_id FROM Donor WHERE user_id = ?",
            [userId]
        );

        if (donorRows.length === 0) {
            await conn.rollback();
            console.error(`No donor record found for user_id: ${userId}`);
            return res.status(404).json({ error: "Donor profile not found." });
        }

        const donorId = donorRows[0].donor_id;

        // 2. Insert into Food_offer
        const [offerResult] = await conn.query(
            `INSERT INTO Food_offer
            (food_name, description, category_id, quantity_by_kg, number_of_person,
             pickup_time, expiration_date_and_time, dietary_information, donor_id, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
            [
                foodName,
                description || null,
                categoryId,
                quantityKg,
                numPersons || 0,
                pickupTime,
                expirationDate,
                dietarySelections || null,
                donorId
            ]
        );

        const newOfferId = offerResult.insertId;

        // 3. Handle optional image upload
        if (req.file) {
            const imageUrl = `/uploads/offers/${req.file.filename}`;
            await conn.query(
                `INSERT INTO Food_photo (image_url, offer_id, uploaded_at)
                 VALUES (?, ?, NOW())`,
                [imageUrl, newOfferId]
            );
        }

        // 4. Log the action in Syslog
        await conn.query(
            `INSERT INTO Syslog (action, description, user_id)
            VALUES (?, ?, ?)`,
            ['Create Offer', `Donor created new food offer: ${foodName}`, userId]
        );

        // 5. Insert into Notifications table for the donor
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, ?, NOW())`,
            [
                'Offer Created Successfully',
                `Your food offer "${foodName}" is now live and available for receivers.`,
                'success',
                userId
            ]
        );

        // ── ADMIN NOTIFICATION: new offer created ──
        const [[donorUser]] = await conn.query(
            "SELECT name FROM User WHERE user_id = ?",
            [userId]
        );
        const donorName = donorUser ? donorUser.name : 'A donor';

        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, NULL, NOW())`,
            [
                'New Food Offer',
                `${donorName} posted a new food offer: "${foodName}".`,
                'new_offer'
            ]
        );

        await conn.commit();
        res.status(201).json({ success: true, offerId: newOfferId });

    } catch (err) {
        await conn.rollback();
        console.error("Create offer error:", err);
        res.status(500).json({ error: "Failed to create offer. " + err.message });
    } finally {
        conn.release();
    }
});

// Delete an offer
app.delete('/api/donor/delete-offer/:offerId', async (req, res) => {
    const { offerId } = req.params;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // Get details before deletion
        const [details] = await conn.query(
            "SELECT o.food_name, d.user_id FROM Food_offer o JOIN Donor d ON o.donor_id = d.donor_id WHERE o.offer_id = ?",
            [offerId]
        );

        // FIX 2: return 404 if offer not found instead of silently doing nothing
        if (details.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Offer not found.' });
        }

        // FIX 1: declare food_name and user_id at the outer scope
        const { food_name, user_id } = details[0];

        await conn.query("DELETE FROM Food_offer WHERE offer_id = ?", [offerId]);

        // Notify the donor
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date) VALUES (?, ?, ?, ?, NOW())`,
            ['Offer Removed', `The offer "${food_name}" has been deleted.`, 'deletion', user_id]
        );

        // Notify the admin (user_id = NULL so admin panel picks it up)
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, NULL, NOW())`,
            [
                'Offer Cancelled',
                `Donor deleted offer "${food_name}" (ID ${offerId}).`,
                'offer_cancelled'
            ]
        );

        await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['cancel_offer', `Donor deleted offer ID ${offerId}`, user_id]
        );

        await conn.commit();
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        conn.release();
    }
});


// ==============================================================
// ──────────────── DONOR MONEY DONATION ────────────────────────
// ==============================================================

// ──── 11. Process Money Donation (FIXED) ────
app.post("/api/donor/donate-money", async (req, res) => {
    const { amount, payment_method, userId, description } = req.body;

    if (!amount || !payment_method || !userId) {
        return res.status(400).json({ error: "Missing required donation details." });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Resolve donor_id from user_id
        const [donorRows] = await conn.query(
            "SELECT donor_id FROM Donor WHERE user_id = ?", [userId]
        );
        if (donorRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: "Donor profile not found for this user." });
        }
        const donorId = donorRows[0].donor_id;

        // Generate a unique reference number e.g. FH-20240421-00042
        const today = new Date();
        const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        const [[{ lastId }]] = await conn.query("SELECT COALESCE(MAX(donation_id), 0) AS lastId FROM Money_donation");
        const refNumber = `FH-${datePart}-${String(Number(lastId) + 1).padStart(5, '0')}`;

        // Insert donation with status = pending
        const [result] = await conn.query(
            `INSERT INTO Money_donation (donation_date, payment_method, amount, donor_id, status, reference_number, notes)
             VALUES (CURDATE(), ?, ?, ?, 'pending', ?, ?)`,
            [payment_method, amount, donorId, refNumber, description || null]
        );

        // Syslog
        await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Donation', `Donor submitted a $${amount} donation via ${payment_method} - ref: ${refNumber}`, userId]
        );

        // Notify the donor - pending confirmation
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date) VALUES (?, ?, ?, ?, 'Donor', NOW())`,
            [
                'Donation Submitted',
                `Your $${amount} donation via ${payment_method} has been submitted and is pending admin approval. Reference: ${refNumber}.`,
                'money_donation',
                userId
            ]
        );

        // Notify the admin - new donation waiting for review
        const [[donorUser]] = await conn.query("SELECT name FROM User WHERE user_id = ?", [userId]);
        const donorName = donorUser?.name || 'A donor';

        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date) VALUES (?, ?, ?, NULL, NOW())`,
            [
                'New Money Donation - Pending Review',
                `${donorName} submitted a $${amount} donation via ${payment_method}. Ref: ${refNumber}. Please review and approve or reject it.`,
                'money_donation'
            ]
        );

        await conn.commit();
        res.status(201).json({
            message: "Your donation has been submitted and is pending admin approval.",
            referenceNumber: refNumber,
            donationId: result.insertId
        });
    } catch (err) {
        await conn.rollback();
        console.error("[ERROR] Donation API failure:", err.message);
        res.status(500).json({ error: "Failed to process donation." });
    } finally {
        conn.release();
    }
});


// ──── 12. Get Donor Money Donation History ────
app.get("/api/donor/money-donations/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await pool.query(
            `SELECT
                md.donation_id,
                md.amount,
                md.payment_method   AS method,
                md.notes            AS note,
                md.donation_date    AS date,
                md.status,
                md.reference_number,
                md.rejection_reason,
                md.reviewed_at
             FROM Money_donation md
             JOIN Donor d ON md.donor_id = d.donor_id
             WHERE d.user_id = ?
             ORDER BY md.donation_date DESC`,
            [userId]
        );
        res.status(200).json(rows);
    } catch (err) {
        console.error("Fetch donation history error:", err);
        res.status(500).json({ error: "Failed to fetch donation history." });
    }
});



app.get('/api/donor/deliveries/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Query to get deliveries for the donor
        // Joins Delivery, Food_offer, and Volunteer tables to get all necessary information
        const query = `
      SELECT
        d.delivery_id,
        d.delivery_status,
        d.delivery_time,
        d.pickup_time,
        d.notes,
        fo.food_name,
        fo.description,
        fo.quantity_by_kg,
        CONCAT(u.name) AS volunteer_name
      FROM delivery d
      INNER JOIN food_offer fo ON d.offer_id = fo.offer_id
      LEFT JOIN volunteer v ON d.volunteer_id = v.volunteer_id
      LEFT JOIN user u ON v.user_id = u.user_id
      WHERE fo.donor_id = (SELECT donor_id FROM donor WHERE user_id = ?)
      ORDER BY
        CASE
          WHEN d.delivery_status = 'in_delivery' THEN 1
          WHEN d.delivery_status = 'delivery_accepted' THEN 2
          WHEN d.delivery_status = 'delivered' THEN 3
          ELSE 4
        END,
        d.delivery_time DESC
    `;

        const [deliveries] = await pool.query(query, [userId]);

        // Return the deliveries
        res.status(200).json(deliveries);

    } catch (error) {
        console.error('Error fetching deliveries:', error);
        res.status(500).json({
            error: 'Failed to fetch deliveries',
            details: error.message
        });
    }
});



// ==============================================================
// ──────────────── DONOR Fund Distribution ─────────────────────
// ==============================================================





// ==============================================================
// ──────────────── DONOR: NOTIFICATIONS ─────────────────────────
// ==============================================================
// 1. Fetch all notifications for the Donor page
app.get("/api/donor/notifications/all/:userId", async (req, res) => {
    try {
        // Filter so a dual-role (Donor + Volunteer) user only sees the
        // notifications that target their Donor side. Legacy rows with NULL
        // recipient_role are shown to all roles for back-compat.
        const [rows] = await pool.query(
            `SELECT * FROM Notifications
             WHERE user_id = ?
               AND (recipient_role IS NULL OR recipient_role = 'Donor')
             ORDER BY date DESC`,
            [req.params.userId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to load notifications." });
    }
});

// 2. Get unread count for Sidebar badge
app.get("/api/donor/notifications/unread-count/:userId", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS count FROM Notifications
             WHERE user_id = ?
               AND read_at IS NULL
               AND (recipient_role IS NULL OR recipient_role = 'Donor')`,
            [req.params.userId]
        );
        res.json({ count: rows[0].count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Mark SINGLE as read (When clicked)
app.post("/api/donor/notifications/mark-read/:notifId", async (req, res) => {
    try {
        await pool.query(
            "UPDATE Notifications SET read_at = NOW() WHERE notification_id = ? AND read_at IS NULL",
            [req.params.notifId]
        );
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to update notification." });
    }
});

// 4. Mark ALL read (Following your exact Receiver logic)
app.post("/api/donor/notifications/mark-all-read/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const [result] = await pool.query(
            `UPDATE Notifications
             SET read_at = NOW()
             WHERE user_id = ? AND read_at IS NULL`,
            [userId]
        );
        res.status(200).json({ message: `${result.affectedRows} notification(s) marked as read.` });
    } catch (err) {
        res.status(500).json({ error: "Failed to mark notifications as read." });
    }
});

// 5. Delete ALL (To clear history)
app.delete("/api/donor/notifications/delete-all/:userId", async (req, res) => {
    try {
        await pool.query("DELETE FROM Notifications WHERE user_id = ?", [req.params.userId]);
        res.status(200).json({ message: "History cleared." });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete notifications." });
    }
});

// 6. Delete a single notification
app.delete("/api/donor/notifications/:notificationId", async (req, res) => {
    const { notificationId } = req.params;
    const { userId } = req.body;   // userId must be sent in body for security

    if (!userId) {
        return res.status(400).json({ error: "User ID is required." });
    }

    try {
        // Verify the notification belongs to this user
        const [notif] = await pool.query(
            "SELECT notification_id FROM Notifications WHERE notification_id = ? AND user_id = ?",
            [notificationId, userId]
        );

        if (notif.length === 0) {
            return res.status(404).json({ error: "Notification not found or does not belong to you." });
        }

        // Delete it
        await pool.query(
            "DELETE FROM Notifications WHERE notification_id = ?",
            [notificationId]
        );

        res.status(200).json({ message: "Notification deleted successfully." });
    } catch (err) {
        console.error("Delete notification error:", err);
        res.status(500).json({ error: "Failed to delete notification." });
    }
});

// Fetch all feedback received by a specific donor
// 🛠 Fixed: was filtering on user_id instead of donor_id and selecting columns
//    that don't exist on User (first_name/last_name → use u.name).
app.get("/api/donor/feedback/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const [[donorRow]] = await pool.query(
            "SELECT donor_id FROM Donor WHERE user_id = ?",
            [userId]
        );
        if (!donorRow) {
            return res.status(200).json([]);
        }

        const [feedbackList] = await pool.query(
            `SELECT
                f.feedback_id,
                f.rating,
                f.comment,
                f.feedback_date,
                f.delivery_id,
                u.name           AS reviewer_name,
                fo.food_name,
                fo.quantity_by_kg
             FROM Feedback_and_rating f
             LEFT JOIN User u        ON u.user_id        = f.given_by
             LEFT JOIN Delivery del  ON del.delivery_id  = f.delivery_id
             LEFT JOIN Food_offer fo ON fo.offer_id      = del.offer_id
             WHERE f.donor_id = ? AND f.volunteer_id IS NULL
             ORDER BY f.feedback_date DESC, f.feedback_id DESC`,
            [donorRow.donor_id]
        );

        res.status(200).json(feedbackList);
    } catch (err) {
        console.error("Error fetching donor feedback:", err);
        res.status(500).json({ error: "Failed to retrieve feedback." });
    }
});







// ==============================================================
// ──────────────── VOLUNTEER PROFILE ───────────────────────────
// ==============================================================

// GET /api/volunteer/profile/:userId
// Returns volunteer profile data + stats (deliveries completed, rating, member since)
app.get('/api/volunteer/profile/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [[profile]] = await pool.query(`
            SELECT
                u.user_id,
                u.name,
                u.email,
                u.phone_number,
                u.profile_picture,
                u.created_at AS join_date,
                v.volunteer_id,
                v.vehicle_type,
                v.plate_number
            FROM User u
            JOIN Volunteer v ON v.user_id = u.user_id
            WHERE u.user_id = ?
            LIMIT 1
        `, [userId]);

        if (!profile) {
            return res.status(404).json({ error: 'Volunteer profile not found.' });
        }

        // Count completed deliveries
        const [[{ deliveriesCompleted }]] = await pool.query(`
            SELECT COUNT(*) AS deliveriesCompleted
            FROM Delivery
            WHERE volunteer_id = ? AND delivery_status = 'completed'
        `, [profile.volunteer_id]);

        // Average rating from feedback
        const [[{ rating }]] = await pool.query(`
            SELECT COALESCE(ROUND(AVG(rating), 1), 0) AS rating
            FROM Feedback_and_rating
            WHERE volunteer_id = ?
        `, [profile.volunteer_id]);

        res.json({
            profile,
            stats: {
                deliveriesCompleted: Number(deliveriesCompleted),
                rating: Number(rating)
            }
        });

    } catch (err) {
        console.error('GET /api/volunteer/profile error:', err);
        res.status(500).json({ error: 'Failed to load volunteer profile.' });
    }
});


// PUT /api/volunteer/profile/:userId
// Updates name, email, phone in User table + vehicle_type, plate_number in Volunteer table
app.put('/api/volunteer/profile/:userId', async (req, res) => {
    const { userId } = req.params;
    const { name, email, phone, vehicle_type, plate_number } = req.body;

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !vehicle_type?.trim() || !plate_number?.trim()) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            'UPDATE User SET name = ?, email = ?, phone_number = ? WHERE user_id = ?',
            [name.trim(), email.trim(), phone.trim(), userId]
        );

        await conn.query(
            'UPDATE Volunteer SET vehicle_type = ?, plate_number = ? WHERE user_id = ?',
            [vehicle_type.trim(), plate_number.trim(), userId]
        );

        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, ?, NOW())`,
            [
                'Profile Updated',
                'Your volunteer profile information has been successfully updated.',
                'profile_update',
                userId
            ]
        );

        await conn.commit();
        res.json({ message: 'Profile updated successfully.' });

    } catch (err) {
        await conn.rollback();
        console.error('PUT /api/volunteer/profile error:', err);
        res.status(500).json({ error: 'Failed to update volunteer profile.' });
    } finally {
        conn.release();
    }
});


// POST /api/volunteer/upload-profile-picture/:userId
// Saves uploaded image to disk and stores URL in User.profile_picture
app.post('/api/volunteer/upload-profile-picture/:userId', upload.single('profilePicture'), async (req, res) => {
    const { userId } = req.params;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const imageUrl = `/uploads/${req.file.filename}`;

    try {
        await pool.query(
            'UPDATE User SET profile_picture = ? WHERE user_id = ?',
            [imageUrl, userId]
        );

        await pool.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, ?, NOW())`,
            [
                'Profile Picture Updated',
                'Your volunteer profile picture has been successfully changed.',
                'profile_update',
                userId
            ]
        );

        res.json({ profile_picture: imageUrl });

    } catch (err) {
        console.error('POST /api/volunteer/upload-profile-picture error:', err);
        res.status(500).json({ error: 'Failed to save profile picture.' });
    }
});


// DELETE /api/volunteer/delete-profile-picture/:userId
// Deletes image file from disk and sets profile_picture = NULL in DB
app.delete('/api/volunteer/delete-profile-picture/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [[user]] = await pool.query(
            'SELECT profile_picture FROM User WHERE user_id = ?',
            [userId]
        );

        if (user && user.profile_picture) {
            const filePath = path.join(__dirname, user.profile_picture);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await pool.query(
            'UPDATE User SET profile_picture = NULL WHERE user_id = ?',
            [userId]
        );

        await pool.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, ?, NOW())`,
            [
                'Profile Picture Removed',
                'Your profile picture has been removed from your account.',
                'profile_update',
                userId
            ]
        );

        res.json({ message: 'Profile picture deleted.' });

    } catch (err) {
        console.error('DELETE /api/volunteer/delete-profile-picture error:', err);
        res.status(500).json({ error: 'Failed to delete profile picture.' });
    }
});


// PUT /api/volunteer/change-password/:userId
// Verifies current password with bcrypt, then hashes and saves the new one
app.put('/api/volunteer/change-password/:userId', async (req, res) => {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 3 || newPassword.length > 10) {
        return res.status(400).json({ error: 'New password must be between 3 and 10 characters.' });
    }

    try {
        const [[user]] = await pool.query(
            'SELECT password FROM User WHERE user_id = ?',
            [userId]
        );

        if (!user) return res.status(404).json({ error: 'User not found.' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect.' });

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE User SET password = ? WHERE user_id = ?', [newHash, userId]);

        await pool.query(
            'INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)',
            ['Password Change', 'Volunteer changed their password', userId]
        );

        await pool.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, ?, NOW())`,
            [
                'Security Alert: Password Changed',
                "The password for your FeedHope account was recently updated. If this wasn't you, contact support.",
                'security',
                userId
            ]
        );

        res.json({ message: 'Password changed successfully.' });

    } catch (err) {
        console.error('PUT /api/volunteer/change-password error:', err);
        res.status(500).json({ error: 'Failed to change password.' });
    }
});

// ==============================================================
// ──────────────── Volunteer accepts request ───────────────────
// ==============================================================

app.put('/api/volunteer/assignment-request/:requestId/accept', async (req, res) => {
    const { requestId } = req.params;
    const { volunteerUserId } = req.body; // for security

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[request]] = await conn.query(
            `SELECT * FROM Volunteer_Assignment_Request
             WHERE request_id = ? AND volunteer_user_id = ? AND status = 'pending'`,
            [requestId, volunteerUserId]
        );
        if (!request) {
            await conn.rollback();
            return res.status(404).json({ error: 'Request not found or already processed.' });
        }

        // Update request status
        await conn.query(
            `UPDATE Volunteer_Assignment_Request
             SET status = 'accepted', responded_at = NOW()
             WHERE request_id = ?`,
            [requestId]
        );

        // Look up offer + volunteer (used for delivery row + notifications)
        const [[offer]] = await conn.query(
            `SELECT fo.donor_id, fo.food_name, fo.offer_id,
                    dnr.user_id AS donor_user_id,
                    rcv.user_id AS receiver_user_id
             FROM Food_offer fo
             JOIN Donor dnr      ON dnr.donor_id  = fo.donor_id
             LEFT JOIN Receiver rcv ON rcv.receiver_id = fo.receiver_id
             WHERE fo.offer_id = ?`,
            [request.offer_id]
        );
        const [[volunteer]] = await conn.query(
            `SELECT volunteer_id FROM Volunteer WHERE user_id = ?`,
            [volunteerUserId]
        );

        // 🛠 Aligned with the manual self-assign flow:
        //   Delivery.delivery_status = 'delivery_accepted'
        //   Food_offer.status        = 'delivery_accepted'
        // so the offer shows up in VolunteerMyDeliveries with the
        // correct "Start Delivery → Mark Delivered" actions.
        await conn.query(
            `INSERT INTO Delivery (delivery_status, volunteer_id, offer_id)
             VALUES ('delivery_accepted', ?, ?)`,
            [volunteer.volunteer_id, request.offer_id]
        );

        await conn.query(
            `UPDATE Food_offer SET status = 'delivery_accepted' WHERE offer_id = ?`,
            [request.offer_id]
        );

        // Notify admin that volunteer accepted
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, NULL, NOW())`,
            ['Assignment Accepted',
             `Volunteer accepted the request for offer "${offer?.food_name}" (Offer #${request.offer_id}).`,
             'assignment_response']
        );

        // Notify the volunteer themselves
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
             VALUES (?, ?, ?, ?, 'Volunteer', NOW())`,
            ['Delivery Accepted',
             `You accepted the admin's delivery request for "${offer?.food_name}". Find it under "My Deliveries".`,
             'delivery_update', volunteerUserId]
        );

        // Notify donor
        if (offer?.donor_user_id) {
            await conn.query(
                `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
                 VALUES (?, ?, ?, ?, 'Donor', NOW())`,
                ['Volunteer Assigned',
                 `A volunteer has accepted to deliver your offer "${offer.food_name}".`,
                 'delivery_update', offer.donor_user_id]
            );
        }

        // Notify receiver
        if (offer?.receiver_user_id) {
            await conn.query(
                `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
                 VALUES (?, ?, ?, ?, 'Receiver', NOW())`,
                ['Volunteer Assigned',
                 `A volunteer has accepted to deliver "${offer.food_name}" to you.`,
                 'delivery_update', offer.receiver_user_id]
            );
        }

        // Remove any expiration alert for this offer (urgency resolved)
        await conn.query(`DELETE FROM expiration_alert WHERE offer_id = ?`, [request.offer_id]);

        await conn.commit();
        res.json({ message: 'Request accepted. You are now assigned to this delivery.' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to accept request.' });
    } finally {
        conn.release();
    }
});




// ==============================================================
// ──────────────── Volunteer rejects request ───────────────────
// ==============================================================

app.put('/api/volunteer/assignment-request/:requestId/reject', async (req, res) => {
    const { requestId } = req.params;
    const { volunteerUserId, reason } = req.body;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[request]] = await conn.query(
            `SELECT * FROM Volunteer_Assignment_Request
             WHERE request_id = ? AND volunteer_user_id = ? AND status = 'pending'`,
            [requestId, volunteerUserId]
        );
        if (!request) {
            await conn.rollback();
            return res.status(404).json({ error: 'Request not found or already processed.' });
        }

        await conn.query(
            `UPDATE Volunteer_Assignment_Request
             SET status = 'rejected', responded_at = NOW(), volunteer_reason = ?
             WHERE request_id = ?`,
            [reason || null, requestId]
        );

        // Notify admin with reason
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, NULL, NOW())`,
            ['Assignment Rejected', `Volunteer rejected the request for offer ID ${request.offer_id}. Reason: ${reason || 'No reason provided.'}`, 'assignment_response', null]
        );

        await conn.commit();
        res.json({ message: 'Request rejected.' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to reject request.' });
    } finally {
        conn.release();
    }
});



// ===============================================================================
// ───── Volunteer fetches pending requests (for their dashboard) ─────
// ===============================================================================

app.get('/api/volunteer/pending-requests/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await pool.query(`
            SELECT r.request_id, r.offer_id, r.admin_message, r.requested_at,
                o.food_name, o.expiration_date_and_time
            FROM Volunteer_Assignment_Request r
            JOIN Food_offer o ON r.offer_id = o.offer_id
            WHERE r.volunteer_user_id = ? AND r.status = 'pending'
            ORDER BY r.requested_at DESC
        `, [userId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch requests.' });
    }
});



// ─────────────────────────────────────────────────────────────
// 🆕 NEW API #1 — GET /api/volunteer/available-offers/:userId
// Returns every Food_offer that:
//    • has status = 'accepted'   (a receiver already claimed it)
//    • has NO Delivery row yet   (no volunteer has self-assigned)
// Includes donor + receiver info so the UI can show full pickup
// and drop-off addresses.
// ─────────────────────────────────────────────────────────────
app.get('/api/volunteer/available-offers/:userId', async (req, res) => {
    try {
        const [offers] = await pool.query(`
            SELECT
                fo.offer_id,
                fo.food_name,
                fo.description,
                fo.dietary_information,
                fo.quantity_by_kg,
                fo.number_of_person,
                fo.pickup_time,
                fo.expiration_date_and_time,
                fo.status,
                fc.category_name        AS category,
                -- Donor (pickup) info
                donor_user.name         AS donor_name,
                donor_user.phone_number AS donor_phone,
                donor_addr.street       AS donor_street,
                donor_addr.city         AS donor_city,
                donor_addr.country      AS donor_country,
                donor_addr.latitude     AS donor_lat,
                donor_addr.longitude    AS donor_lon,
                -- Receiver (drop-off) info
                receiver_user.name           AS receiver_name,
                receiver_user.phone_number   AS receiver_phone,
                rcv.organization_name        AS receiver_org,
                receiver_addr.street         AS receiver_street,
                receiver_addr.city           AS receiver_city,
                receiver_addr.country        AS receiver_country,
                receiver_addr.latitude       AS receiver_lat,
                receiver_addr.longitude      AS receiver_lon
            FROM Food_offer fo
            JOIN Donor dnr           ON fo.donor_id = dnr.donor_id
            JOIN User  donor_user    ON dnr.user_id = donor_user.user_id
            JOIN Address donor_addr  ON dnr.address_id = donor_addr.address_id
            LEFT JOIN Food_category fc ON fc.category_id = fo.category_id
            JOIN Receiver rcv             ON fo.receiver_id = rcv.receiver_id
            JOIN User receiver_user       ON rcv.user_id = receiver_user.user_id
            LEFT JOIN Receiver_location rl ON rl.receiver_id = rcv.receiver_id
            LEFT JOIN Address receiver_addr ON rl.address_id = receiver_addr.address_id
            WHERE fo.status = 'accepted'
              AND NOT EXISTS (SELECT 1 FROM Delivery d WHERE d.offer_id = fo.offer_id)
            ORDER BY fo.offer_id DESC
        `);

        // Compute distance (km) between donor and receiver for each row
        const enriched = offers.map(o => {
            const distance = calculateDistance(o.donor_lat, o.donor_lon, o.receiver_lat, o.receiver_lon);
            return {
                offer_id: o.offer_id,
                food_name: o.food_name,
                description: o.description,
                dietary_information: o.dietary_information,
                quantity_by_kg: o.quantity_by_kg,
                number_of_person: o.number_of_person,
                pickup_time: o.pickup_time,
                expiration_date_and_time: o.expiration_date_and_time,
                status: o.status,
                category: o.category,
                donor_name: o.donor_name,
                donor_phone: o.donor_phone,
                donor_address: [o.donor_street, o.donor_city, o.donor_country].filter(Boolean).join(', '),
                donor_lat: o.donor_lat != null ? Number(o.donor_lat) : null,
                donor_lon: o.donor_lon != null ? Number(o.donor_lon) : null,
                receiver_name: o.receiver_org || o.receiver_name,
                receiver_phone: o.receiver_phone,
                receiver_address: [o.receiver_street, o.receiver_city, o.receiver_country].filter(Boolean).join(', '),
                receiver_lat: o.receiver_lat != null ? Number(o.receiver_lat) : null,
                receiver_lon: o.receiver_lon != null ? Number(o.receiver_lon) : null,
                distance_km: distance
            };
        });

        res.json({ offers: enriched });
    } catch (err) {
        console.error('GET /api/volunteer/available-offers error:', err);
        res.status(500).json({ error: 'Failed to fetch available offers.' });
    }
});


// ─────────────────────────────────────────────────────────────
// 🆕 NEW API #2 — POST /api/volunteer/accept-delivery
// Body: { userId, offerId }
// The volunteer self-assigns. We:
//   1. Verify the volunteer profile exists for this userId
//   2. Verify the offer is still status = 'accepted' and unclaimed
//   3. INSERT into Delivery (delivery_status = 'delivery_accepted')
//   4. UPDATE Food_offer.status = 'delivery_accepted'
//   5. Notify donor + receiver + the volunteer themselves
// ─────────────────────────────────────────────────────────────
app.post('/api/volunteer/accept-delivery', async (req, res) => {
    const { userId, offerId } = req.body;
    if (!userId || !offerId) {
        return res.status(400).json({ error: 'userId and offerId are required.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Look up volunteer_id for this user
        const [[volunteerRow]] = await conn.query(
            'SELECT volunteer_id FROM Volunteer WHERE user_id = ?',
            [userId]
        );
        if (!volunteerRow) {
            await conn.rollback();
            return res.status(404).json({ error: 'Volunteer profile not found.' });
        }
        const volunteerId = volunteerRow.volunteer_id;

        // 2. Lock-and-check the offer
        const [[offer]] = await conn.query(
            `SELECT fo.offer_id, fo.status, fo.food_name,
                    dnr.user_id AS donor_user_id,
                    rcv.user_id AS receiver_user_id
             FROM Food_offer fo
             JOIN Donor dnr ON fo.donor_id = dnr.donor_id
             LEFT JOIN Receiver rcv ON fo.receiver_id = rcv.receiver_id
             WHERE fo.offer_id = ?
             FOR UPDATE`,
            [offerId]
        );
        if (!offer) {
            await conn.rollback();
            return res.status(404).json({ error: 'Offer not found.' });
        }
        if (offer.status !== 'accepted') {
            await conn.rollback();
            return res.status(409).json({ error: 'This offer is no longer available for delivery.' });
        }

        // Make sure no other volunteer has already taken it
        const [[existing]] = await conn.query(
            'SELECT delivery_id FROM Delivery WHERE offer_id = ? LIMIT 1',
            [offerId]
        );
        if (existing) {
            await conn.rollback();
            return res.status(409).json({ error: 'Another volunteer has already accepted this delivery.' });
        }

        // 3. Insert Delivery row
        const [delIns] = await conn.query(
            `INSERT INTO Delivery (delivery_status, volunteer_id, offer_id)
             VALUES ('delivery_accepted', ?, ?)`,
            [volunteerId, offerId]
        );

        // 4. Update Food_offer status
        await conn.query(
            `UPDATE Food_offer SET status = 'delivery_accepted' WHERE offer_id = ?`,
            [offerId]
        );

        // 5. Notifications
        // Volunteer (self)
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
             VALUES (?, ?, ?, ?, 'Volunteer', NOW())`,
            ['Delivery Accepted',
                `You have accepted the delivery for "${offer.food_name}". Head to the pickup location when ready.`,
                'delivery_update', userId]
        );
        // Donor
        if (offer.donor_user_id) {
            await conn.query(
                `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
                 VALUES (?, ?, ?, ?, 'Donor', NOW())`,
                ['Volunteer Assigned',
                    `A volunteer has accepted to deliver your offer "${offer.food_name}".`,
                    'delivery_update', offer.donor_user_id]
            );
        }
        // Receiver
        if (offer.receiver_user_id) {
            await conn.query(
                `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
                 VALUES (?, ?, ?, ?, 'Receiver', NOW())`,
                ['Volunteer Assigned',
                    `A volunteer has accepted to deliver "${offer.food_name}" to you.`,
                    'delivery_update', offer.receiver_user_id]
            );
        }

        // Syslog
        await conn.query(
            `INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)`,
            ['VOLUNTEER_ACCEPT_DELIVERY',
                `Volunteer accepted delivery for offer #${offerId}`, userId]
        );

        await conn.commit();
        res.status(200).json({
            message: 'Delivery accepted! You can find it under "My Deliveries".',
            delivery_id: delIns.insertId
        });
    } catch (err) {
        await conn.rollback();
        console.error('POST /api/volunteer/accept-delivery error:', err);
        res.status(500).json({ error: 'Failed to accept delivery.' });
    } finally {
        conn.release();
    }
});


// ─────────────────────────────────────────────────────────────
// 🆕 NEW API #3 — GET /api/volunteer/my-deliveries/:userId
// Returns every Delivery row owned by THIS volunteer, with full
// donor/receiver/offer info. The frontend splits them into
// "Active" (delivery_accepted | in_delivery) vs "History" (delivered).
// ─────────────────────────────────────────────────────────────
app.get('/api/volunteer/my-deliveries/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [[volunteerRow]] = await pool.query(
            'SELECT volunteer_id FROM Volunteer WHERE user_id = ?',
            [userId]
        );
        if (!volunteerRow) {
            return res.status(404).json({ error: 'Volunteer profile not found.' });
        }

        const [rows] = await pool.query(`
            SELECT
                d.delivery_id,
                d.delivery_status,
                d.delivery_time,
                d.pickup_time         AS delivery_pickup_time,
                d.notes,
                fo.offer_id,
                fo.food_name,
                fo.description,
                fo.quantity_by_kg,
                fo.number_of_person,
                fo.pickup_time,
                fo.expiration_date_and_time,
                fo.status             AS offer_status,
                fc.category_name      AS category,
                donor_user.name       AS donor_name,
                donor_user.phone_number AS donor_phone,
                donor_addr.street     AS donor_street,
                donor_addr.city       AS donor_city,
                donor_addr.country    AS donor_country,
                donor_addr.latitude   AS donor_lat,
                donor_addr.longitude  AS donor_lon,
                receiver_user.name        AS receiver_name,
                receiver_user.phone_number AS receiver_phone,
                rcv.organization_name     AS receiver_org,
                receiver_addr.street      AS receiver_street,
                receiver_addr.city        AS receiver_city,
                receiver_addr.country     AS receiver_country,
                receiver_addr.latitude    AS receiver_lat,
                receiver_addr.longitude   AS receiver_lon
            FROM Delivery d
            JOIN Food_offer fo ON d.offer_id = fo.offer_id
            JOIN Donor dnr           ON fo.donor_id = dnr.donor_id
            JOIN User donor_user     ON dnr.user_id = donor_user.user_id
            JOIN Address donor_addr  ON dnr.address_id = donor_addr.address_id
            LEFT JOIN Food_category fc ON fc.category_id = fo.category_id
            LEFT JOIN Receiver rcv             ON fo.receiver_id = rcv.receiver_id
            LEFT JOIN User receiver_user       ON rcv.user_id = receiver_user.user_id
            LEFT JOIN Receiver_location rl     ON rl.receiver_id = rcv.receiver_id
            LEFT JOIN Address receiver_addr    ON rl.address_id = receiver_addr.address_id
            WHERE d.volunteer_id = ?
            ORDER BY
                CASE d.delivery_status
                    WHEN 'in_delivery'        THEN 1
                    WHEN 'delivery_accepted'  THEN 2
                    WHEN 'delivered'          THEN 3
                    ELSE 4
                END,
                d.delivery_id DESC
        `, [volunteerRow.volunteer_id]);

        const deliveries = rows.map(r => ({
            delivery_id: r.delivery_id,
            offer_id: r.offer_id,
            delivery_status: r.delivery_status,
            offer_status: r.offer_status,
            food_name: r.food_name,
            description: r.description,
            quantity_by_kg: r.quantity_by_kg,
            number_of_person: r.number_of_person,
            category: r.category,
            pickup_time: r.pickup_time,
            expiration_date_and_time: r.expiration_date_and_time,
            delivery_time: r.delivery_time,
            notes: r.notes,
            donor_name: r.donor_name,
            donor_phone: r.donor_phone,
            donor_address: [r.donor_street, r.donor_city, r.donor_country].filter(Boolean).join(', '),
            donor_lat: r.donor_lat != null ? Number(r.donor_lat) : null,
            donor_lon: r.donor_lon != null ? Number(r.donor_lon) : null,
            receiver_name: r.receiver_org || r.receiver_name,
            receiver_phone: r.receiver_phone,
            receiver_address: [r.receiver_street, r.receiver_city, r.receiver_country].filter(Boolean).join(', '),
            receiver_lat: r.receiver_lat != null ? Number(r.receiver_lat) : null,
            receiver_lon: r.receiver_lon != null ? Number(r.receiver_lon) : null,
            distance_km: calculateDistance(r.donor_lat, r.donor_lon, r.receiver_lat, r.receiver_lon)
        }));

        res.json({ deliveries });
    } catch (err) {
        console.error('GET /api/volunteer/my-deliveries error:', err);
        res.status(500).json({ error: 'Failed to fetch deliveries.' });
    }
});


// ─────────────────────────────────────────────────────────────
// 🆕 NEW API #4 — PUT /api/volunteer/deliveries/:deliveryId/start
// Body: { userId }
// "I'm on my way to the receiver"
//   • Delivery.delivery_status   = 'in_delivery'
//   • Delivery.pickup_time       = NOW()  (volunteer just picked it up)
//   • Food_offer.status          = 'in_delivery'
// ─────────────────────────────────────────────────────────────
app.put('/api/volunteer/deliveries/:deliveryId/start', async (req, res) => {
    const { deliveryId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[del]] = await conn.query(`
            SELECT d.delivery_id, d.delivery_status, d.offer_id, d.volunteer_id,
                   v.user_id AS volunteer_user_id,
                   fo.food_name,
                   dnr.user_id AS donor_user_id,
                   rcv.user_id AS receiver_user_id
            FROM Delivery d
            JOIN Volunteer v ON d.volunteer_id = v.volunteer_id
            JOIN Food_offer fo ON d.offer_id = fo.offer_id
            JOIN Donor dnr ON fo.donor_id = dnr.donor_id
            LEFT JOIN Receiver rcv ON fo.receiver_id = rcv.receiver_id
            WHERE d.delivery_id = ?
        `, [deliveryId]);

        if (!del) {
            await conn.rollback();
            return res.status(404).json({ error: 'Delivery not found.' });
        }
        if (Number(del.volunteer_user_id) !== Number(userId)) {
            await conn.rollback();
            return res.status(403).json({ error: 'This delivery does not belong to you.' });
        }
        if (del.delivery_status !== 'delivery_accepted') {
            await conn.rollback();
            return res.status(409).json({ error: `Cannot start delivery from status "${del.delivery_status}".` });
        }

        await conn.query(
            `UPDATE Delivery SET delivery_status = 'in_delivery', pickup_time = NOW() WHERE delivery_id = ?`,
            [deliveryId]
        );
        await conn.query(
            `UPDATE Food_offer SET status = 'in_delivery' WHERE offer_id = ?`,
            [del.offer_id]
        );

        // Notify donor + receiver
        if (del.donor_user_id) {
            await conn.query(
                `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
                 VALUES (?, ?, ?, ?, 'Donor', NOW())`,
                ['Delivery In Progress',
                    `Your offer "${del.food_name}" has been picked up and is on the way.`,
                    'delivery_update', del.donor_user_id]
            );
        }
        if (del.receiver_user_id) {
            await conn.query(
                `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
                 VALUES (?, ?, ?, ?, 'Receiver', NOW())`,
                ['Delivery On The Way',
                    `Your delivery "${del.food_name}" is on the way.`,
                    'delivery_update', del.receiver_user_id]
            );
        }

        await conn.query(
            `INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)`,
            ['VOLUNTEER_START_DELIVERY',
                `Volunteer started delivery #${deliveryId}`, userId]
        );

        await conn.commit();
        res.json({ message: 'Delivery started — status is now In Delivery.' });
    } catch (err) {
        await conn.rollback();
        console.error('PUT /api/volunteer/deliveries/:id/start error:', err);
        res.status(500).json({ error: 'Failed to start delivery.' });
    } finally {
        conn.release();
    }
});


// ─────────────────────────────────────────────────────────────
// 🆕 NEW API #5 — PUT /api/volunteer/deliveries/:deliveryId/complete
// Body: { userId }
// "I arrived and handed the offer to the receiver"
//   • Delivery.delivery_status = 'delivered'
//   • Delivery.delivery_time   = NOW()
//   • Food_offer.status        = 'delivered'
//   • Donation_history row inserted (donor → receiver)
// ─────────────────────────────────────────────────────────────
app.put('/api/volunteer/deliveries/:deliveryId/complete', async (req, res) => {
    const { deliveryId } = req.params;
    const { userId, notes } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });
    const trimmedNotes = (typeof notes === 'string' && notes.trim()) ? notes.trim() : null;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[del]] = await conn.query(`
            SELECT d.delivery_id, d.delivery_status, d.offer_id, d.volunteer_id,
                   v.user_id AS volunteer_user_id,
                   fo.food_name, fo.donor_id, fo.receiver_id, fo.quantity_by_kg,
                   dnr.user_id AS donor_user_id,
                   rcv.user_id AS receiver_user_id
            FROM Delivery d
            JOIN Volunteer v ON d.volunteer_id = v.volunteer_id
            JOIN Food_offer fo ON d.offer_id = fo.offer_id
            JOIN Donor dnr ON fo.donor_id = dnr.donor_id
            LEFT JOIN Receiver rcv ON fo.receiver_id = rcv.receiver_id
            WHERE d.delivery_id = ?
        `, [deliveryId]);

        if (!del) {
            await conn.rollback();
            return res.status(404).json({ error: 'Delivery not found.' });
        }
        if (Number(del.volunteer_user_id) !== Number(userId)) {
            await conn.rollback();
            return res.status(403).json({ error: 'This delivery does not belong to you.' });
        }
        if (del.delivery_status !== 'in_delivery') {
            await conn.rollback();
            return res.status(409).json({ error: `Cannot mark as delivered from status "${del.delivery_status}". Start the delivery first.` });
        }

        await conn.query(
            `UPDATE Delivery
                SET delivery_status = 'delivered',
                    delivery_time   = NOW(),
                    notes           = ?
              WHERE delivery_id = ?`,
            [trimmedNotes, deliveryId]
        );
        await conn.query(
            `UPDATE Food_offer SET status = 'delivered' WHERE offer_id = ?`,
            [del.offer_id]
        );

        // Donation history (donor → receiver) — only if a receiver exists
        if (del.receiver_id) {
            await conn.query(
                `INSERT INTO Donation_history (donation_date, quantity, receiver_id, donor_id)
                 VALUES (CURDATE(), ?, ?, ?)`,
                [del.quantity_by_kg || null, del.receiver_id, del.donor_id]
            );
        }

        // Notifications: donor, receiver, volunteer
        if (del.donor_user_id) {
            await conn.query(
                `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
                 VALUES (?, ?, ?, ?, 'Donor', NOW())`,
                ['Delivery Completed',
                    `Your offer "${del.food_name}" has been successfully delivered. Thank you!`,
                    'delivery_completed', del.donor_user_id]
            );
        }
        if (del.receiver_user_id) {
            await conn.query(
                `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
                 VALUES (?, ?, ?, ?, 'Receiver', NOW())`,
                ['Delivery Received',
                    `You have received "${del.food_name}". Thank you for using FeedHope!`,
                    'delivery_completed', del.receiver_user_id]
            );
        }
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
             VALUES (?, ?, ?, ?, 'Volunteer', NOW())`,
            ['Delivery Completed',
                `Great work! You successfully delivered "${del.food_name}".`,
                'delivery_completed', userId]
        );

        await conn.query(
            `INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)`,
            ['VOLUNTEER_COMPLETE_DELIVERY',
                `Volunteer completed delivery #${deliveryId}`, userId]
        );

        await conn.commit();
        res.json({ message: 'Delivery marked as delivered. Thank you!' });
    } catch (err) {
        await conn.rollback();
        console.error('PUT /api/volunteer/deliveries/:id/complete error:', err);
        res.status(500).json({ error: 'Failed to mark as delivered.' });
    } finally {
        conn.release();
    }
});

// ─────────────────────────────────────────────────────────────
// 🆕 NEW API #6 — GET /api/volunteer/history/:userId
// Returns every COMPLETED delivery for this volunteer (status
// 'delivered' or legacy 'completed'), enriched with donor/receiver
// info, the volunteer's own completion notes, and any feedback
// the volunteer received for that delivery (averaged if multiple
// people rated them — donor + receiver could each leave a rating).
// Also returns aggregate stats so the UI doesn't have to compute.
// ─────────────────────────────────────────────────────────────
app.get('/api/volunteer/history/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [[volunteerRow]] = await pool.query(
            'SELECT volunteer_id FROM Volunteer WHERE user_id = ?',
            [userId]
        );
        if (!volunteerRow) {
            return res.status(404).json({ error: 'Volunteer profile not found.' });
        }

        const [rows] = await pool.query(`
            SELECT
                d.delivery_id,
                d.delivery_status,
                d.delivery_time,
                d.pickup_time          AS delivery_pickup_time,
                d.notes                AS delivery_notes,
                fo.offer_id,
                fo.food_name,
                fo.description,
                fo.quantity_by_kg,
                fo.number_of_person,
                fc.category_name       AS category,
                donor_user.name        AS donor_name,
                donor_addr.street      AS donor_street,
                donor_addr.city        AS donor_city,
                donor_addr.country     AS donor_country,
                donor_addr.latitude    AS donor_lat,
                donor_addr.longitude   AS donor_lon,
                receiver_user.name     AS receiver_name,
                rcv.organization_name  AS receiver_org,
                receiver_addr.street   AS receiver_street,
                receiver_addr.city     AS receiver_city,
                receiver_addr.country  AS receiver_country,
                receiver_addr.latitude AS receiver_lat,
                receiver_addr.longitude AS receiver_lon,
                fb.avg_rating,
                fb.latest_comment,
                fb.latest_date
            FROM Delivery d
            JOIN Food_offer fo            ON d.offer_id = fo.offer_id
            JOIN Donor dnr                ON fo.donor_id = dnr.donor_id
            JOIN User  donor_user         ON dnr.user_id = donor_user.user_id
            JOIN Address donor_addr       ON dnr.address_id = donor_addr.address_id
            LEFT JOIN Food_category fc    ON fc.category_id = fo.category_id
            LEFT JOIN Receiver rcv        ON fo.receiver_id = rcv.receiver_id
            LEFT JOIN User receiver_user  ON rcv.user_id = receiver_user.user_id
            LEFT JOIN Receiver_location rl  ON rl.receiver_id = rcv.receiver_id
            LEFT JOIN Address receiver_addr ON rl.address_id = receiver_addr.address_id
            LEFT JOIN (
                SELECT delivery_id, volunteer_id,
                       ROUND(AVG(rating), 1)        AS avg_rating,
                       MAX(comment)                 AS latest_comment,
                       MAX(feedback_date)           AS latest_date
                FROM Feedback_and_rating
                WHERE volunteer_id IS NOT NULL AND delivery_id IS NOT NULL
                GROUP BY delivery_id, volunteer_id
            ) fb ON fb.delivery_id = d.delivery_id AND fb.volunteer_id = d.volunteer_id
            WHERE d.volunteer_id = ?
              AND d.delivery_status IN ('delivered', 'completed')
            ORDER BY d.delivery_time DESC, d.delivery_id DESC
        `, [volunteerRow.volunteer_id]);

        const deliveries = rows.map(r => ({
            delivery_id: r.delivery_id,
            offer_id: r.offer_id,
            delivery_status: r.delivery_status,
            food_name: r.food_name,
            description: r.description,
            quantity_by_kg: r.quantity_by_kg,
            number_of_person: r.number_of_person,
            category: r.category,
            pickup_time: r.delivery_pickup_time,
            delivery_time: r.delivery_time,
            delivery_notes: r.delivery_notes,
            donor_name: r.donor_name,
            donor_address: [r.donor_street, r.donor_city, r.donor_country].filter(Boolean).join(', '),
            receiver_name: r.receiver_org || r.receiver_name,
            receiver_address: [r.receiver_street, r.receiver_city, r.receiver_country].filter(Boolean).join(', '),
            distance_km: calculateDistance(r.donor_lat, r.donor_lon, r.receiver_lat, r.receiver_lon),
            rating: r.avg_rating != null ? Number(r.avg_rating) : null,
            rating_comment: r.latest_comment,
            rating_date: r.latest_date
        }));

        const totalDeliveries = deliveries.length;
        const peopleHelped = deliveries.reduce((s, d) => s + (Number(d.number_of_person) || 0), 0);
        const ratingVals = deliveries.map(d => d.rating).filter(r => r != null);
        const avgRating = ratingVals.length
            ? Number((ratingVals.reduce((a, b) => a + b, 0) / ratingVals.length).toFixed(1))
            : 0;
        const totalDistance = Number(
            deliveries.reduce((s, d) => s + (Number(d.distance_km) || 0), 0).toFixed(1)
        );

        res.json({
            deliveries,
            stats: { totalDeliveries, peopleHelped, avgRating, totalDistance }
        });
    } catch (err) {
        console.error('GET /api/volunteer/history error:', err);
        res.status(500).json({ error: 'Failed to fetch delivery history.' });
    }
});


// ─────────────────────────────────────────────────────────────
// 🆕 NEW API #7 — GET /api/volunteer/feedback/:userId
// All ratings/comments left for THIS volunteer by receivers,
// joined with the offer + donor + receiver info so the page
// can show "what was delivered, who said it". Returns the list
// plus aggregate stats (avg, count, 5-star count).
// ─────────────────────────────────────────────────────────────
app.get('/api/volunteer/feedback/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [[volunteerRow]] = await pool.query(
            'SELECT volunteer_id FROM Volunteer WHERE user_id = ?',
            [userId]
        );
        if (!volunteerRow) {
            return res.status(200).json({
                feedbacks: [],
                stats: { totalRatings: 0, averageRating: 0, fiveStarCount: 0 }
            });
        }

        const [feedbacks] = await pool.query(`
            SELECT
                f.feedback_id,
                f.rating,
                f.comment,
                f.feedback_date,
                f.delivery_id,
                u_giver.name           AS reviewer_name,
                fo.offer_id,
                fo.food_name,
                fo.quantity_by_kg,
                fo.number_of_person,
                fc.category_name,
                u_donor.name           AS donor_name,
                u_recv.name            AS receiver_name,
                rcv.organization_name  AS receiver_org,
                del.delivery_time
            FROM Feedback_and_rating f
            LEFT JOIN User u_giver       ON u_giver.user_id = f.given_by
            LEFT JOIN Delivery del       ON del.delivery_id = f.delivery_id
            LEFT JOIN Food_offer fo      ON fo.offer_id     = del.offer_id
            LEFT JOIN Food_category fc   ON fc.category_id  = fo.category_id
            LEFT JOIN Donor dnr          ON dnr.donor_id    = fo.donor_id
            LEFT JOIN User u_donor       ON u_donor.user_id = dnr.user_id
            LEFT JOIN Receiver rcv       ON rcv.receiver_id = fo.receiver_id
            LEFT JOIN User u_recv        ON u_recv.user_id  = rcv.user_id
            WHERE f.volunteer_id = ? AND f.donor_id IS NULL
            ORDER BY f.feedback_date DESC, f.feedback_id DESC
        `, [volunteerRow.volunteer_id]);

        const ratings = feedbacks
            .map(f => Number(f.rating))
            .filter(r => !Number.isNaN(r));
        const totalRatings = ratings.length;
        const averageRating = totalRatings
            ? Number((ratings.reduce((a, b) => a + b, 0) / totalRatings).toFixed(1))
            : 0;
        const fiveStarCount = ratings.filter(r => r >= 5).length;

        res.json({
            feedbacks,
            stats: { totalRatings, averageRating, fiveStarCount }
        });
    } catch (err) {
        console.error('GET /api/volunteer/feedback error:', err);
        res.status(500).json({ error: 'Failed to fetch feedback.' });
    }
});


// ==============================================================
// 🆕 VOLUNTEER: NOTIFICATIONS — full CRUD (mirrors Donor APIs)
// ==============================================================

// 🆕 NEW API #8 — GET /api/volunteer/notifications/all/:userId
// All notifications for this volunteer, newest first.

app.get('/api/volunteer/notifications/all/:userId', async (req, res) => {
    try {
        // Volunteer-side notifications only — dual-role users won't see their
        // Donor / Receiver notifications mixed in here.
        const [rows] = await pool.query(
            `SELECT * FROM Notifications
             WHERE user_id = ?
               AND (recipient_role IS NULL OR recipient_role = 'Volunteer')
             ORDER BY date DESC`,
            [req.params.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error('GET /api/volunteer/notifications/all error:', err);
        res.status(500).json({ error: 'Failed to load notifications.' });
    }
});

// 🆕 NEW API #9 — GET /api/volunteer/notifications/unread-count/:userId
// Used by the sidebar badge.
app.get('/api/volunteer/notifications/unread-count/:userId', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS count FROM Notifications
             WHERE user_id = ?
               AND read_at IS NULL
               AND (recipient_role IS NULL OR recipient_role = 'Volunteer')`,
            [req.params.userId]
        );
        res.json({ count: rows[0].count });
    } catch (err) {
        console.error('GET /api/volunteer/notifications/unread-count error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 🆕 NEW API #10 — POST /api/volunteer/notifications/mark-read/:notifId
// Mark a single notification as read.
app.post('/api/volunteer/notifications/mark-read/:notifId', async (req, res) => {
    try {
        await pool.query(
            'UPDATE Notifications SET read_at = NOW() WHERE notification_id = ? AND read_at IS NULL',
            [req.params.notifId]
        );
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('POST /api/volunteer/notifications/mark-read error:', err);
        res.status(500).json({ error: 'Failed to update notification.' });
    }
});

// 🆕 NEW API #11 — POST /api/volunteer/notifications/mark-all-read/:userId
app.post('/api/volunteer/notifications/mark-all-read/:userId', async (req, res) => {
    try {
        const [result] = await pool.query(
            `UPDATE Notifications SET read_at = NOW()
             WHERE user_id = ? AND read_at IS NULL`,
            [req.params.userId]
        );
        res.status(200).json({ message: `${result.affectedRows} notification(s) marked as read.` });
    } catch (err) {
        console.error('POST /api/volunteer/notifications/mark-all-read error:', err);
        res.status(500).json({ error: 'Failed to mark notifications as read.' });
    }
});

// 🆕 NEW API #12 — DELETE /api/volunteer/notifications/delete-all/:userId
app.delete('/api/volunteer/notifications/delete-all/:userId', async (req, res) => {
    try {
        await pool.query('DELETE FROM Notifications WHERE user_id = ?', [req.params.userId]);
        res.status(200).json({ message: 'History cleared.' });
    } catch (err) {
        console.error('DELETE /api/volunteer/notifications/delete-all error:', err);
        res.status(500).json({ error: 'Failed to delete notifications.' });
    }
});

// 🆕 NEW API #13 — DELETE /api/volunteer/notifications/:notificationId
// Body: { userId } — verifies ownership before deletion.
app.delete('/api/volunteer/notifications/:notificationId', async (req, res) => {
    const { notificationId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });
    try {
        const [notif] = await pool.query(
            'SELECT notification_id FROM Notifications WHERE notification_id = ? AND user_id = ?',
            [notificationId, userId]
        );
        if (notif.length === 0) {
            return res.status(404).json({ error: 'Notification not found or does not belong to you.' });
        }
        await pool.query('DELETE FROM Notifications WHERE notification_id = ?', [notificationId]);
        res.status(200).json({ message: 'Notification deleted successfully.' });
    } catch (err) {
        console.error('DELETE /api/volunteer/notifications/:id error:', err);
        res.status(500).json({ error: 'Failed to delete notification.' });
    }
});


// ─────────────────────────────────────────────────────────────
// 🆕 NEW API #14 — GET /api/volunteer/dashboard/:userId
// One-shot summary for the volunteer dashboard:
//   • profile name
//   • stats: completed/active deliveries, avg rating, people helped
//   • top 5 available offers (claimed by a receiver, no volunteer yet)
//   • top 5 active deliveries owned by this volunteer
//   • recent activities (deliveries + ratings received), newest first
//   • achievement progress (first_delivery, rising_star, weekend_hero)
//   • most recent rating received
// ─────────────────────────────────────────────────────────────
app.get('/api/volunteer/dashboard/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [[userRow]] = await pool.query(
            `SELECT u.user_id, u.name, v.volunteer_id
             FROM User u JOIN Volunteer v ON v.user_id = u.user_id
             WHERE u.user_id = ?`,
            [userId]
        );
        if (!userRow) {
            return res.status(404).json({ error: 'Volunteer not found.' });
        }
        const volunteerId = userRow.volunteer_id;

        // ── Stats ────────────────────────────────────────────────
        const [[{ completedDeliveries }]] = await pool.query(
            `SELECT COUNT(*) AS completedDeliveries
             FROM Delivery
             WHERE volunteer_id = ? AND delivery_status IN ('delivered', 'completed')`,
            [volunteerId]
        );
        const [[{ activeDeliveries }]] = await pool.query(
            `SELECT COUNT(*) AS activeDeliveries
             FROM Delivery
             WHERE volunteer_id = ? AND delivery_status IN ('delivery_accepted', 'in_delivery')`,
            [volunteerId]
        );
        const [[{ avgRating, ratingCount }]] = await pool.query(
            `SELECT COALESCE(ROUND(AVG(rating), 1), 0) AS avgRating,
                    COUNT(*) AS ratingCount
             FROM Feedback_and_rating
             WHERE volunteer_id = ? AND donor_id IS NULL`,
            [volunteerId]
        );
        const [[{ peopleHelped }]] = await pool.query(
            `SELECT COALESCE(SUM(fo.number_of_person), 0) AS peopleHelped
             FROM Delivery d JOIN Food_offer fo ON fo.offer_id = d.offer_id
             WHERE d.volunteer_id = ? AND d.delivery_status IN ('delivered', 'completed')`,
            [volunteerId]
        );

        // ── Available offers (status='accepted', no Delivery yet) ─
        const [availRows] = await pool.query(`
            SELECT
                fo.offer_id,
                fo.food_name,
                fo.pickup_time,
                fo.quantity_by_kg,
                donor_user.name      AS donor_name,
                donor_addr.street    AS donor_street,
                donor_addr.city      AS donor_city,
                donor_addr.latitude  AS donor_lat,
                donor_addr.longitude AS donor_lon,
                rcv.organization_name AS receiver_org,
                receiver_user.name   AS receiver_name,
                receiver_addr.latitude  AS receiver_lat,
                receiver_addr.longitude AS receiver_lon
            FROM Food_offer fo
            JOIN Donor dnr           ON fo.donor_id = dnr.donor_id
            JOIN User  donor_user    ON dnr.user_id = donor_user.user_id
            JOIN Address donor_addr  ON dnr.address_id = donor_addr.address_id
            JOIN Receiver rcv             ON fo.receiver_id = rcv.receiver_id
            JOIN User receiver_user       ON rcv.user_id = receiver_user.user_id
            LEFT JOIN Receiver_location rl ON rl.receiver_id = rcv.receiver_id
            LEFT JOIN Address receiver_addr ON rl.address_id = receiver_addr.address_id
            WHERE fo.status = 'accepted'
              AND NOT EXISTS (SELECT 1 FROM Delivery d WHERE d.offer_id = fo.offer_id)
            ORDER BY fo.offer_id DESC
            LIMIT 5
        `);
        const availableDeliveries = availRows.map(r => ({
            offer_id:    r.offer_id,
            food_name:   r.food_name,
            donor_name:  r.donor_name,
            donor_address: [r.donor_street, r.donor_city].filter(Boolean).join(', '),
            receiver_name: r.receiver_org || r.receiver_name,
            pickup_time: r.pickup_time,
            quantity_by_kg: r.quantity_by_kg,
            distance_km: calculateDistance(r.donor_lat, r.donor_lon, r.receiver_lat, r.receiver_lon)
        }));

        // ── Active deliveries (this volunteer) ────────────────────
        const [activeRows] = await pool.query(`
            SELECT
                d.delivery_id,
                d.delivery_status,
                fo.offer_id,
                fo.food_name,
                fo.quantity_by_kg,
                fo.pickup_time,
                donor_user.name AS donor_name,
                rcv.organization_name AS receiver_org,
                receiver_user.name    AS receiver_name
            FROM Delivery d
            JOIN Food_offer fo            ON d.offer_id = fo.offer_id
            JOIN Donor dnr                ON fo.donor_id = dnr.donor_id
            JOIN User  donor_user         ON dnr.user_id = donor_user.user_id
            LEFT JOIN Receiver rcv        ON fo.receiver_id = rcv.receiver_id
            LEFT JOIN User receiver_user  ON rcv.user_id = receiver_user.user_id
            WHERE d.volunteer_id = ?
              AND d.delivery_status IN ('delivery_accepted', 'in_delivery')
            ORDER BY
                CASE d.delivery_status WHEN 'in_delivery' THEN 1 ELSE 2 END,
                d.delivery_id DESC
            LIMIT 5
        `, [volunteerId]);
        const activeDeliveriesList = activeRows.map(r => ({
            delivery_id: r.delivery_id,
            delivery_status: r.delivery_status,
            food_name: r.food_name,
            quantity_by_kg: r.quantity_by_kg,
            donor_name: r.donor_name,
            receiver_name: r.receiver_org || r.receiver_name,
            pickup_time: r.pickup_time
        }));

        // ── Recent activities (deliveries + ratings) ──────────────
        const [deliveryActs] = await pool.query(`
            SELECT d.delivery_id, d.delivery_status, d.delivery_time, fo.food_name,
                   COALESCE(rcv.organization_name, recv_user.name) AS receiver_name
            FROM Delivery d
            JOIN Food_offer fo ON fo.offer_id = d.offer_id
            LEFT JOIN Receiver rcv     ON rcv.receiver_id = fo.receiver_id
            LEFT JOIN User recv_user   ON recv_user.user_id = rcv.user_id
            WHERE d.volunteer_id = ?
            ORDER BY d.delivery_id DESC
            LIMIT 10
        `, [volunteerId]);
        const [ratingActs] = await pool.query(`
            SELECT f.feedback_id, f.rating, f.comment, f.feedback_date, fo.food_name
            FROM Feedback_and_rating f
            LEFT JOIN Delivery d  ON d.delivery_id = f.delivery_id
            LEFT JOIN Food_offer fo ON fo.offer_id = d.offer_id
            WHERE f.volunteer_id = ? AND f.donor_id IS NULL
            ORDER BY f.feedback_date DESC, f.feedback_id DESC
            LIMIT 10
        `, [volunteerId]);

        const acts = [];
        for (const d of deliveryActs) {
            const t = d.delivery_time ? new Date(d.delivery_time).toISOString() : null;
            if (d.delivery_status === 'delivered' || d.delivery_status === 'completed') {
                acts.push({ kind: 'completed', time: t,
                    text: `Delivered "${d.food_name}" to ${d.receiver_name || 'receiver'}` });
            } else if (d.delivery_status === 'in_delivery') {
                acts.push({ kind: 'started', time: t,
                    text: `Started delivery of "${d.food_name}"` });
            } else if (d.delivery_status === 'delivery_accepted') {
                acts.push({ kind: 'accepted', time: t,
                    text: `Accepted "${d.food_name}" delivery` });
            }
        }
        for (const f of ratingActs) {
            acts.push({
                kind: 'rating',
                time: f.feedback_date ? new Date(f.feedback_date).toISOString() : null,
                text: `Received a ${Number(f.rating).toFixed(0)}-star rating${f.food_name ? ` for "${f.food_name}"` : ''}`
            });
        }
        const recentActivities = acts
            .filter(a => a.time)
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 5);

        // ── Top Partners (replaces achievements) ──────────────────
        // Real data: receivers this volunteer has delivered to most often,
        // with delivery count and total kg.
        const [topPartners] = await pool.query(`
            SELECT
                rcv.receiver_id,
                COALESCE(rcv.organization_name, u.name) AS receiver_name,
                COUNT(*) AS delivery_count,
                COALESCE(SUM(fo.quantity_by_kg), 0) AS total_kg,
                COALESCE(SUM(fo.number_of_person), 0) AS people_helped
            FROM Delivery d
            JOIN Food_offer fo ON fo.offer_id = d.offer_id
            JOIN Receiver rcv  ON rcv.receiver_id = fo.receiver_id
            JOIN User u        ON u.user_id = rcv.user_id
            WHERE d.volunteer_id = ?
              AND d.delivery_status IN ('delivered', 'completed')
            GROUP BY rcv.receiver_id
            ORDER BY delivery_count DESC, total_kg DESC
            LIMIT 5
        `, [volunteerId]);

        // ── Top rating (most recent) ──────────────────────────────
        const [[topRating]] = await pool.query(`
            SELECT
                f.rating, f.comment, f.feedback_date,
                fo.food_name,
                u_giver.name AS reviewer_name,
                u_donor.name AS donor_name,
                COALESCE(rcv.organization_name, u_recv.name) AS receiver_name
            FROM Feedback_and_rating f
            LEFT JOIN Delivery d   ON d.delivery_id = f.delivery_id
            LEFT JOIN Food_offer fo ON fo.offer_id  = d.offer_id
            LEFT JOIN User u_giver  ON u_giver.user_id = f.given_by
            LEFT JOIN Donor dnr     ON dnr.donor_id = fo.donor_id
            LEFT JOIN User u_donor  ON u_donor.user_id = dnr.user_id
            LEFT JOIN Receiver rcv  ON rcv.receiver_id = fo.receiver_id
            LEFT JOIN User u_recv   ON u_recv.user_id = rcv.user_id
            WHERE f.volunteer_id = ? AND f.donor_id IS NULL
            ORDER BY f.feedback_date DESC, f.feedback_id DESC
            LIMIT 1
        `, [volunteerId]);

        res.json({
            user: { user_id: userRow.user_id, name: userRow.name },
            stats: {
                completedDeliveries: Number(completedDeliveries),
                activeDeliveries:    Number(activeDeliveries),
                avgRating:           Number(avgRating),
                ratingCount:         Number(ratingCount),
                peopleHelped:        Number(peopleHelped)
            },
            availableDeliveries,
            activeDeliveries: activeDeliveriesList,
            recentActivities,
            topPartners,
            topRating: topRating || null
        });
    } catch (err) {
        console.error('GET /api/volunteer/dashboard error:', err);
        res.status(500).json({ error: 'Failed to load dashboard.' });
    }
});



// ────────────────────── Admin ─────────────────────────


// ==============================================================
// ──────────────── Admin Food Offers Page  ─────────────────────
// ==============================================================

// ─────────────────────────────────────────────────────────────
//  GET /api/admin/food-offers
//  Returns all food offers with donor name + category, plus distinct
//  statuses and categories for filter dropdowns.
// ─────────────────────────────────────────────────────────────
app.get('/api/admin/food-offers', async (req, res) => {
    try {
        // All offers with donor name, category name, and donor city.
        // Hide offers that are expired — either explicitly (status='expired')
        // or because the expiration_date_and_time has already passed even if a
        // cron run hasn't flipped them to 'expired' yet.
        const [offers] = await pool.query(`
            SELECT
                fo.offer_id,
                fo.food_name,
                fo.number_of_person AS portions,
                fo.status,
                fo.expiration_date_and_time AS expiry_date,
                fo.pickup_time,
                fo.description,
                u.name AS donor_name,
                a.city AS donor_city,
                fc.category_name AS category
            FROM Food_offer fo
            JOIN Donor d ON fo.donor_id = d.donor_id
            JOIN User u ON d.user_id = u.user_id
            LEFT JOIN Address a ON a.user_id = u.user_id
            LEFT JOIN Food_category fc ON fo.category_id = fc.category_id
            WHERE fo.status IN ('available', 'accepted', 'delivery_accepted', 'in_delivery', 'delivered')
              AND (fo.expiration_date_and_time IS NULL
                   OR fo.expiration_date_and_time > NOW())
            ORDER BY fo.offer_id DESC
        `);

        // Status dropdown — restrict to the active lifecycle stages only:
        // Available → Accepted → Delivery Accepted → In Delivery → Delivered.
        // Hides terminal/edge statuses (expired, cancelled, completed) from
        // the filter so the admin only sees in-progress states.
        const allowedStatuses = ['available', 'accepted', 'delivery_accepted', 'in_delivery', 'delivered'];
        const statusRows = allowedStatuses.map(status => ({ status }));

        // Distinct categories (for dropdown) - from Food_category table
        const [catRows] = await pool.query(`
            SELECT category_name FROM Food_category ORDER BY category_name
        `);

        res.json({
            offers,
            statuses: statusRows.map(r => r.status),
            categories: catRows.map(r => r.category_name),
        });
    } catch (err) {
        console.error('GET /api/admin/food-offers error:', err);
        res.status(500).json({ error: 'Failed to fetch food offers.' });
    }
});


// ─────────────────────────────────────────────────────────────
//  GET /api/admin/volunteers
//  Returns all active volunteers (for the Assign dropdown).
// ─────────────────────────────────────────────────────────────
app.get('/api/admin/volunteers', async (req, res) => {
    try {
        const [volunteers] = await pool.query(`
            SELECT u.user_id, u.name, u.phone_number AS phone
            FROM User u
            JOIN Role r ON u.user_id = r.user_id
            WHERE r.role_name = 'Volunteer'
            ORDER BY u.name ASC
        `);
        res.json({ volunteers });
    } catch (err) {
        console.error('GET /api/admin/volunteers error:', err);
        res.status(500).json({ error: 'Failed to fetch volunteers.' });
    }
});


// ─────────────────────────────────────────────────────────────
//  PUT /api/admin/food-offers/assign-volunteer 
//  Assigns a volunteer to an offer, creates a Delivery record,
//  sets Food_offer.status = 'in_delivery'
// ─────────────────────────────────────────────────────────────
app.put('/api/admin/food-offers/assign-volunteer', async (req, res) => {
    const { offerId, volunteerId: volunteerUserId } = req.body; // volunteerUserId is user_id
    if (!offerId || !volunteerUserId) {
        return res.status(400).json({ error: 'offerId and volunteerId (user_id) are required.' });
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Get the actual volunteer_id from Volunteer table using user_id
        const [[volunteerRow]] = await conn.query(
            `SELECT volunteer_id FROM Volunteer WHERE user_id = ?`,
            [volunteerUserId]
        );
        if (!volunteerRow) {
            await conn.rollback();
            return res.status(404).json({ error: 'Volunteer profile not found for this user.' });
        }
        const actualVolunteerId = volunteerRow.volunteer_id;

        // 2. Fetch offer details for notifications + gating check
        const [[offerDetails]] = await conn.query(`
            SELECT fo.food_name, fo.status, fo.receiver_id, d.user_id AS donor_user_id
            FROM Food_offer fo
            JOIN Donor d ON d.donor_id = fo.donor_id
            WHERE fo.offer_id = ?
        `, [offerId]);

        if (!offerDetails) {
            await conn.rollback();
            return res.status(404).json({ error: 'Offer not found.' });
        }

        // 🛠 Gate: only allow assigning a volunteer once a receiver has accepted.
        if (offerDetails.status !== 'accepted' || !offerDetails.receiver_id) {
            await conn.rollback();
            return res.status(409).json({
                error: 'A volunteer can only be assigned after a receiver has accepted this offer.'
            });
        }

        // 3. Update Food_offer status
        const [result] = await conn.query(`
            UPDATE Food_offer
            SET status = 'in_delivery'
            WHERE offer_id = ?
        `, [offerId]);

        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Offer not found.' });
        }

        // 4. Insert into Delivery table with status 'in_transit' (so it appears as In Transit immediately)
        await conn.query(`
            INSERT INTO Delivery (delivery_status, volunteer_id, offer_id, pickup_time)
            VALUES ('in_delivery', ?, ?, NOW())
        `, [actualVolunteerId, offerId]);

        // 5. ADMIN NOTIFICATION
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
            VALUES (?, ?, ?, NULL, NOW())`,
            [
                'Volunteer Assigned',
                `Volunteer (user_id ${volunteerUserId}) assigned to deliver "${offerDetails.food_name}" (Offer #${offerId}) and is now In Transit.`,
                'volunteer_assigned'
            ]
        );

        // 6. Notify donor
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
            VALUES (?, ?, ?, ?, 'Donor', NOW())`,
            ['Delivery Assigned', `A volunteer has been assigned to deliver your offer "${offerDetails.food_name}" and is now on the way.`, 'delivery_update', offerDetails.donor_user_id]
        );

        await conn.commit();
        res.json({ message: 'Volunteer assigned successfully. Delivery is now In Transit.' });
    } catch (err) {
        await conn.rollback();
        console.error('PUT /api/admin/food-offers/assign-volunteer error:', err);
        res.status(500).json({ error: 'Failed to assign volunteer.' });
    } finally {
        conn.release();
    }
});


// ─────────────────────────────────────────────────────────────
//  PUT /api/admin/food-offers/:offerId/expire
//  Marks an offer as expired.
// ─────────────────────────────────────────────────────────────
app.put('/api/admin/food-offers/:offerId/expire', async (req, res) => {
    const { offerId } = req.params;
    try {
        const [result] = await pool.query(`
            UPDATE Food_offer
            SET status = 'expired'
            WHERE offer_id = ?
        `, [offerId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Offer not found.' });
        }
        res.json({ message: 'Offer marked as expired.' });
    } catch (err) {
        console.error('PUT /api/admin/food-offers/:offerId/expire error:', err);
        res.status(500).json({ error: 'Failed to expire offer.' });
    }
});


// ─────────────────────────────────────────────────────────────
//  PUT /api/admin/food-offers/:offerId/cancel
//  Cancels an offer.
// ─────────────────────────────────────────────────────────────
app.put('/api/admin/food-offers/:offerId/cancel', async (req, res) => {
    const { offerId } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Look up donor (to notify) before mutating
        const [[offer]] = await conn.query(`
            SELECT fo.food_name, dnr.user_id AS donor_user_id, fo.receiver_id,
                   rcv.user_id AS receiver_user_id
            FROM Food_offer fo
            JOIN Donor dnr ON dnr.donor_id = fo.donor_id
            LEFT JOIN Receiver rcv ON rcv.receiver_id = fo.receiver_id
            WHERE fo.offer_id = ?
        `, [offerId]);

        if (!offer) {
            await conn.rollback();
            return res.status(404).json({ error: 'Offer not found.' });
        }

        const [result] = await conn.query(
            `UPDATE Food_offer SET status = 'cancelled' WHERE offer_id = ?`,
            [offerId]
        );
        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Offer not found.' });
        }

        // Notify the donor that admin cancelled their offer
        if (offer.donor_user_id) {
            await conn.query(
                `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
                 VALUES (?, ?, ?, ?, 'Donor', NOW())`,
                ['Offer Cancelled',
                 `Your offer "${offer.food_name}" has been cancelled by an administrator.`,
                 'offer_cancelled', offer.donor_user_id]
            );
        }

        // Notify the receiver too if they had already claimed it
        if (offer.receiver_user_id) {
            await conn.query(
                `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
                 VALUES (?, ?, ?, ?, 'Receiver', NOW())`,
                ['Offer Cancelled',
                 `The offer "${offer.food_name}" you accepted has been cancelled by an administrator.`,
                 'offer_cancelled', offer.receiver_user_id]
            );
        }

        // Admin-side notification (user_id NULL = goes to admin inbox)
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, NULL, NOW())`,
            ['Offer Cancelled',
             `Offer "${offer.food_name}" (#${offerId}) was cancelled.`,
             'offer_cancelled']
        );

        // Drop any open expiration alert for this offer — no longer relevant
        await conn.query(`DELETE FROM expiration_alert WHERE offer_id = ?`, [offerId]);

        await conn.commit();
        res.json({ message: 'Offer cancelled.' });
    } catch (err) {
        await conn.rollback();
        console.error('PUT /api/admin/food-offers/:offerId/cancel error:', err);
        res.status(500).json({ error: 'Failed to cancel offer.' });
    } finally {
        conn.release();
    }
});




// ==============================================================
// ──────────────── Admin Money Donations Page  ─────────────────
// ==============================================================

// ─────────────────────────────────────────────────────────────
//  GET /api/admin/money-donations
//  Returns all money donations with donor name, amount, payment method, date.
// ─────────────────────────────────────────────────────────────
app.get('/api/admin/money-donations', async (req, res) => {
    const { status } = req.query;
    try {
        let query = `
            SELECT
                md.donation_id,
                md.amount,
                md.payment_method,
                md.notes AS description,
                md.donation_date,
                md.status,
                md.reference_number,
                md.rejection_reason,
                md.reviewed_at,
                u.name AS donor_name
            FROM Money_donation md
            JOIN Donor d ON md.donor_id = d.donor_id
            JOIN User  u ON d.user_id   = u.user_id
        `;
        const params = [];
        if (status) {
            query += ' WHERE md.status = ?';
            params.push(status);
        }
        query += ' ORDER BY md.donation_date DESC';

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('GET /api/admin/money-donations error:', err);
        res.status(500).json({ error: 'Failed to fetch money donations.' });
    }
});



app.put('/api/admin/money-donations/:id/approve', async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[donation]] = await conn.query(`
            SELECT md.amount, md.payment_method, md.reference_number,
                d.user_id AS donor_user_id
            FROM Money_donation md
            JOIN Donor d ON d.donor_id = md.donor_id
            WHERE md.donation_id = ?
        `, [id]);

        if (!donation) return res.status(404).json({ error: 'Donation not found.' });

        await conn.query(
            `UPDATE Money_donation SET status = 'approved', reviewed_at = NOW() WHERE donation_id = ?`,
            [id]
        );

        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date) VALUES (?, ?, ?, ?, 'Donor', NOW())`,
            [
                'Donation Approved',
                `Your $${Number(donation.amount).toFixed(2)} donation via ${donation.payment_method} (Ref: ${donation.reference_number}) has been approved. Thank you!`,
                'money_donation',
                donation.donor_user_id
            ]
        );

        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date) VALUES (?, ?, ?, NULL, NOW())`,
            [
                'Donation Approved',
                `Donation of $${Number(donation.amount).toFixed(2)} (Ref: ${donation.reference_number}) approved and added to balance.`,
                'money_donation'
            ]
        );

        await conn.commit();
        res.json({ message: 'Donation approved successfully.' });
    } catch (err) {
        await conn.rollback();
        console.error('PUT /api/admin/money-donations/:id/approve error:', err);
        res.status(500).json({ error: 'Failed to approve donation.' });
    } finally {
        conn.release();
    }
});


// ──  PUT /api/admin/money-donations/:id/reject ───────
app.put('/api/admin/money-donations/:id/reject', async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason?.trim())
        return res.status(400).json({ error: 'A rejection reason is required.' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[donation]] = await conn.query(`
            SELECT md.amount, md.payment_method, md.reference_number,
                d.user_id AS donor_user_id
            FROM Money_donation md
            JOIN Donor d ON d.donor_id = md.donor_id
            WHERE md.donation_id = ?
        `, [id]);

        if (!donation) return res.status(404).json({ error: 'Donation not found.' });

        await conn.query(
            `UPDATE Money_donation SET status = 'rejected', rejection_reason = ?, reviewed_at = NOW() WHERE donation_id = ?`,
            [reason.trim(), id]
        );

        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date) VALUES (?, ?, ?, ?, 'Donor', NOW())`,
            [
                'Donation Rejected',
                `Your $${Number(donation.amount).toFixed(2)} donation via ${donation.payment_method} (Ref: ${donation.reference_number}) was rejected. Reason: ${reason.trim()}.`,
                'money_donation',
                donation.donor_user_id
            ]
        );

        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date) VALUES (?, ?, ?, NULL, NOW())`,
            [
                'Donation Rejected',
                `Donation of $${Number(donation.amount).toFixed(2)} (Ref: ${donation.reference_number}) was rejected. Reason: ${reason.trim()}.`,
                'money_donation'
            ]
        );

        await conn.commit();
        res.json({ message: 'Donation rejected.' });
    } catch (err) {
        await conn.rollback();
        console.error('PUT /api/admin/money-donations/:id/reject error:', err);
        res.status(500).json({ error: 'Failed to reject donation.' });
    } finally {
        conn.release();
    }
});

// ==============================================================
// ──────────────── Admin User Management Page  ─────────────────
// ==============================================================

// ─────────────────────────────────────────────────────────────
//  GET /api/admin/users
//  Returns every registered user with their role, status,
//  address, and (for Donors) total food donations count.
//  Used to populate the User Management table.
// ─────────────────────────────────────────────────────────────
app.get('/api/admin/users', async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT
                u.user_id,
                u.name,
                u.email,
                u.phone_number        AS phone,
                u.status,
                u.profile_picture,
                u.created_at,
                r.role_name           AS role,
                a.street,
                a.city,
                a.country,
                CONCAT_WS(', ', a.street, a.city, a.country) AS address,

                -- Common role fields
                COALESCE(d.business_type, rec.business_type) AS business_type,

                -- Total food donations (Donor only)
                (
                    SELECT COUNT(*)
                    FROM Food_offer fo
                    WHERE fo.donor_id = d.donor_id
                ) AS total_donations,

                -- Volunteer specific fields
                v.vehicle_type,
                v.plate_number,
                (
                    SELECT COUNT(*)
                    FROM Delivery del
                    WHERE del.volunteer_id = v.volunteer_id
                ) AS total_deliveries,
                (
                    SELECT AVG(fr.rating)
                    FROM Feedback_and_rating fr
                    WHERE fr.volunteer_id = v.volunteer_id
                ) AS volunteer_rating,

                -- Receiver specific fields
                (
                    SELECT COUNT(*)
                    FROM Food_offer fo
                    WHERE fo.receiver_id = rec.receiver_id
                    AND fo.status IN ('accepted', 'completed')
                ) AS total_received,
                (
                    SELECT COALESCE(SUM(fo.number_of_person), 0)
                    FROM Food_offer fo
                    WHERE fo.receiver_id = rec.receiver_id
                    AND fo.status IN ('accepted', 'completed')
                ) AS people_served,

                -- Donor rating
                (
                    SELECT AVG(fr.rating)
                    FROM Feedback_and_rating fr
                    WHERE fr.donor_id = d.donor_id
                ) AS donor_rating

            FROM User u
            LEFT JOIN Role    r   ON r.user_id   = u.user_id
            LEFT JOIN Address a   ON a.user_id   = u.user_id
            LEFT JOIN Donor   d   ON d.user_id   = u.user_id
            LEFT JOIN Receiver rec ON rec.user_id = u.user_id
            LEFT JOIN Volunteer v  ON v.user_id   = u.user_id
            ORDER BY u.created_at DESC
        `);

        // Normalise ratings to a number or null
        const formattedUsers = users.map(user => ({
            ...user,
            volunteer_rating: user.volunteer_rating ? parseFloat(user.volunteer_rating).toFixed(1) : null,
            donor_rating: user.donor_rating ? parseFloat(user.donor_rating).toFixed(1) : null,
            total_deliveries: user.total_deliveries || 0,
            total_received: user.total_received || 0,
            people_served: user.people_served || 0,
            total_donations: user.total_donations || 0
        }));

        res.json({ users: formattedUsers });
    } catch (err) {
        console.error('GET /api/admin/users error:', err);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});


// ─────────────────────────────────────────────────────────────
//  PUT /api/admin/users/:id  (EDIT USER)
//  Updates name, email, phone, status. Also:
//    - Syncs organization_name in Donor/Receiver if name changed
//    - Inserts a notification for the affected user
// ─────────────────────────────────────────────────────────────
app.put('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, status } = req.body;

    // Validate required fields
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required.' });
    }

    const allowedStatuses = ['active', 'blocked', 'pending', 'Active', 'Blocked'];
    if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Fetch current user data to detect what changed
        const [[oldUser]] = await conn.query(
            `SELECT name, email, phone_number, status FROM User WHERE user_id = ?`,
            [id]
        );
        if (!oldUser) {
            await conn.rollback();
            return res.status(404).json({ error: 'User not found.' });
        }

        // 2. Update the User table
        const [updateResult] = await conn.query(
            `UPDATE User
             SET name = ?, email = ?, phone_number = ?, status = ?
             WHERE user_id = ?`,
            [name, email, phone || null, status || oldUser.status, id]
        );

        if (updateResult.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'User not found.' });
        }

        // 3. If name changed, sync with role-specific tables
        if (name !== oldUser.name) {
            // Check user's role
            const [[roleRow]] = await conn.query(
                `SELECT role_name FROM Role WHERE user_id = ? LIMIT 1`,
                [id]
            );
            if (roleRow) {
                const role = roleRow.role_name;
                if (role === 'Donor') {
                    await conn.query(
                        `UPDATE Donor SET organization_name = ? WHERE user_id = ?`,
                        [name, id]
                    );
                } else if (role === 'Receiver') {
                    await conn.query(
                        `UPDATE Receiver SET organization_name = ? WHERE user_id = ?`,
                        [name, id]
                    );
                }
                // Volunteer has no organization_name - nothing to sync
            }
        }

        // 4. Build notification message describing the changes
        const changes = [];
        if (name !== oldUser.name) changes.push(`name from "${oldUser.name}" to "${name}"`);
        if (email !== oldUser.email) changes.push(`email from "${oldUser.email}" to "${email}"`);
        if (phone !== oldUser.phone_number) changes.push(`phone number from "${oldUser.phone_number || 'not set'}" to "${phone || 'not set'}"`);
        if (status && status !== oldUser.status) changes.push(`account status from "${oldUser.status}" to "${status}"`);

        let notificationMessage = '';
        if (changes.length > 0) {
            notificationMessage = `An administrator updated your ${changes.join(', ')}.`;
        } else {
            notificationMessage = 'An administrator reviewed your account information. No changes were made.';
        }

        // 5. Insert notification for the user
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
            VALUES (?, ?, ?, ?, NOW())`,
            ['Account Updated by Admin', notificationMessage, 'admin_action', id]
        );

        // 6. Audit log
        await conn.query(
            `INSERT INTO Syslog (action, description, user_id)
            VALUES (?, ?, ?)`,
            ['AdminEditUser', `Admin updated user_id ${id}`, id]
        );

        await conn.commit();

        // Return success with the list of changes
        res.json({
            message: 'User updated successfully.',
            changes: changes.length ? changes : ['No changes applied']
        });

    } catch (err) {
        await conn.rollback();
        console.error('PUT /api/admin/users/:id error:', err);
        res.status(500).json({ error: 'Failed to update user.' });
    } finally {
        conn.release();
    }
});





// ─────────────────────────────────────────────────────────────
//  PUT /api/admin/users/:id/block
//  Sets a user's status to 'blocked' so they cannot sign in.
//  No request body needed - the action is always "block".
// ─────────────────────────────────────────────────────────────
app.put('/api/admin/users/:id/block', async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(`
            UPDATE User
            SET status = 'blocked'
            WHERE user_id = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Audit log: record which user was blocked and when
        await pool.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['AdminBlockUser', `Admin blocked user_id ${id}`, id]
        );

        res.json({ message: 'User blocked successfully.' });
    } catch (err) {
        console.error('PUT /api/admin/users/:id/block error:', err);
        res.status(500).json({ error: 'Failed to block user.' });
    }
});


// ─────────────────────────────────────────────────────────────
//  DELETE /api/admin/users/:id
//  Permanently removes a user and all their related records.
// ─────────────────────────────────────────────────────────────
app.delete('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Get role-specific IDs before we delete anything
        const [[donorRow]] = await conn.query("SELECT donor_id     FROM Donor     WHERE user_id = ?", [id]);
        const [[receiverRow]] = await conn.query("SELECT receiver_id  FROM Receiver  WHERE user_id = ?", [id]);
        const [[volunteerRow]] = await conn.query("SELECT volunteer_id FROM Volunteer WHERE user_id = ?", [id]);

        const donorId = donorRow?.donor_id ?? null;
        const receiverId = receiverRow?.receiver_id ?? null;
        const volunteerId = volunteerRow?.volunteer_id ?? null;

        // 2. FIX: Food_offer.receiver_id - Receiver is ON DELETE RESTRICT
        //    Must NULL out the reference before Receiver can be deleted
        if (receiverId) {
            await conn.query(
                "UPDATE Food_offer SET receiver_id = NULL WHERE receiver_id = ?",
                [receiverId]
            );
        }

        // 3. FIX: Delivery.volunteer_id - Volunteer is ON DELETE RESTRICT
        //    Must delete Delivery rows before Volunteer can be deleted
        if (volunteerId) {
            await conn.query("DELETE FROM Delivery WHERE volunteer_id = ?", [volunteerId]);
        }

        // 4. FIX: Fund_distribution.volunteer_id - Volunteer is ON DELETE RESTRICT
        //    Must delete Fund_distribution rows before Volunteer can be deleted
        if (volunteerId) {
            await conn.query("DELETE FROM Fund_distribution WHERE volunteer_id = ?", [volunteerId]);
        }

        // 5. Delete role-specific tables BEFORE Address
        //    (Donor.address_id - Address is ON DELETE RESTRICT - this was the main crash)
        //    Deleting Donor also cascades: Money_donation, Donation_history, Food_offer, Fund_distribution (donor_id)
        //    Deleting Receiver also cascades: Receiver_location, Donation_history
        await conn.query("DELETE FROM Donor     WHERE user_id = ?", [id]);
        await conn.query("DELETE FROM Receiver  WHERE user_id = ?", [id]);
        await conn.query("DELETE FROM Volunteer WHERE user_id = ?", [id]);

        // 6. NOW safe to delete Address (Donor no longer references it)
        await conn.query("DELETE FROM Address WHERE user_id = ?", [id]);

        // 7. Delete remaining user-linked tables
        //    (These all have ON DELETE CASCADE from User so they'd auto-delete,
        //     but we delete explicitly to keep the transaction clean)
        await conn.query("DELETE FROM Notifications          WHERE user_id = ?", [id]);
        await conn.query("DELETE FROM Syslog                 WHERE user_id = ?", [id]);
        await conn.query("DELETE FROM Email_verification     WHERE user_id = ?", [id]);
        await conn.query("DELETE FROM Password_reset_token   WHERE user_id = ?", [id]);
        await conn.query("DELETE FROM User_Role              WHERE user_id = ?", [id]);
        await conn.query("DELETE FROM Role                   WHERE user_id = ?", [id]);

        // 8. Finally delete the User row itself
        const [result] = await conn.query("DELETE FROM User WHERE user_id = ?", [id]);

        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'User not found.' });
        }

        await conn.commit();
        res.json({ message: 'User deleted successfully.' });

    } catch (err) {
        await conn.rollback();
        console.error('DELETE /api/admin/users/:id error:', err);
        res.status(500).json({ error: 'Failed to delete user: ' + err.message });
    } finally {
        conn.release();
    }
});


// ─────────────────────────────────────────────────────────────
//  PUT /api/admin/users/:id/unblock
//  Sets a user's status back to 'active' so they can sign in again.
//  No request body needed - the action is always "unblock".
// ─────────────────────────────────────────────────────────────
app.put('/api/admin/users/:id/unblock', async (req, res) => {
    const { id } = req.params;

    try {
        // Make sure the user exists and is currently blocked before unblocking
        const [[user]] = await pool.query(
            "SELECT status FROM User WHERE user_id = ?",
            [id]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (user.status !== 'blocked') {
            return res.status(400).json({ error: 'User is not blocked.' });
        }

        const [result] = await pool.query(`
            UPDATE User
            SET status = 'active'
            WHERE user_id = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Audit log: record which user was unblocked and when
        await pool.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['AdminUnblockUser', `Admin unblocked user_id ${id}`, id]
        );

        res.json({ message: 'User unblocked successfully.' });
    } catch (err) {
        console.error('PUT /api/admin/users/:id/unblock error:', err);
        res.status(500).json({ error: 'Failed to unblock user.' });
    }
});


// ==============================================================
// ──────────────── Admin Fund Distribution Page  ───────────────
// ==============================================================

// ─────────────────────────────────────────────────────────────
//  GET /api/admin/fund-distribution
// ─────────────────────────────────────────────────────────────
app.get('/api/admin/fund-distribution', async (req, res) => {
    try {
        // Only APPROVED donations count toward collectible balance
        const [[{ totalCollected }]] = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) AS totalCollected
            FROM Money_donation WHERE status = 'approved'
        `);
        const [[{ totalDistributed }]] = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) AS totalDistributed
            FROM Fund_Distribution WHERE status IN ('pending', 'completed')
        `);
        const balance = Math.max(0, Number(totalCollected) - Number(totalDistributed));

        const [distributions] = await pool.query(`
            SELECT
                fd.distribution_id,
                fd.amount,
                fd.distribution_date,
                fd.payment_method,
                fd.status,
                fd.purpose,
                fd.admin_id,
                fd.donor_id,
                u.name AS donor_name
            FROM Fund_Distribution fd
            LEFT JOIN Donor d ON d.donor_id = fd.donor_id
            LEFT JOIN User  u ON u.user_id  = d.user_id
            ORDER BY fd.distribution_date DESC, fd.distribution_id DESC
        `);

        res.json({ totalCollected: Number(totalCollected), totalDistributed: Number(totalDistributed), balance, distributions });
    } catch (err) {
        console.error('GET /api/admin/fund-distribution error:', err);
        res.status(500).json({ error: 'Failed to load fund distribution data.' });
    }
});


// ─────────────────────────────────────────────────────────────
//  POST /api/admin/fund-distribution
// ─────────────────────────────────────────────────────────────
app.post('/api/admin/fund-distribution', async (req, res) => {
    const { amount, paymentMethod, purpose, donorName, adminId } = req.body;

    if (!amount || amount <= 0)
        return res.status(400).json({ error: 'A valid positive amount is required.' });
    if (!paymentMethod?.trim())
        return res.status(400).json({ error: 'Payment method is required.' });
    if (!purpose?.trim())
        return res.status(400).json({ error: 'Reason for distribution is required.' });
    if (!donorName?.trim())
        return res.status(400).json({ error: 'Recipient donor name is required.' });

    try {
        const [[donorRow]] = await pool.query(`
            SELECT d.donor_id, d.user_id
            FROM Donor d
            JOIN User u ON u.user_id = d.user_id
            WHERE u.name = ?
            LIMIT 1
        `, [donorName.trim()]);

        if (!donorRow)
            return res.status(400).json({ error: `No donor found with the name "${donorName.trim()}".` });

        const donorId = donorRow.donor_id;
        const donorUserId = donorRow.user_id;

        // Resolve admin
        let resolvedAdminId = null;
        if (adminId) {
            const [[adminRow]] = await pool.query("SELECT admin_id FROM Admin WHERE admin_id = ?", [adminId]);
            if (adminRow) resolvedAdminId = adminRow.admin_id;
        }
        if (!resolvedAdminId) {
            const [[fallbackAdmin]] = await pool.query("SELECT admin_id FROM Admin LIMIT 1");
            resolvedAdminId = fallbackAdmin?.admin_id ?? null;
        }

        // Check balance - only against completed distributions
        const [[{ totalCollected }]] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) AS totalCollected FROM Money_donation WHERE status = 'approved'`
        );
        const [[{ totalDistributed }]] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) AS totalDistributed FROM Fund_Distribution WHERE status IN ('pending', 'completed')`
        );
        const balance = Math.max(0, Number(totalCollected) - Number(totalDistributed));

        if (Number(amount) > balance)
            return res.status(400).json({ error: `Insufficient balance. Available: $${balance.toFixed(2)}` });

        // Generate reference number
        const today = new Date();
        const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        const [[{ lastId }]] = await pool.query("SELECT COALESCE(MAX(distribution_id), 0) AS lastId FROM Fund_Distribution");
        const refNumber = `FD-${datePart}-${String(Number(lastId) + 1).padStart(5, '0')}`;

        // Insert as PENDING - donor must confirm
        const [insertResult] = await pool.query(`
            INSERT INTO Fund_Distribution (amount, distribution_date, payment_method, status, purpose, admin_id, donor_id, reference_number)
            VALUES (?, CURDATE(), ?, 'pending', ?, ?, ?, ?)
        `, [Number(amount), paymentMethod.trim(), purpose.trim(), resolvedAdminId, donorId, refNumber]);

        // Syslog
        const [[adminUser]] = await pool.query("SELECT user_id FROM Admin WHERE admin_id = ?", [resolvedAdminId]);
        await pool.query(`INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)`, [
            'FundDistribution',
            `Admin initiated a $${Number(amount).toFixed(2)} distribution to "${donorName.trim()}" via ${paymentMethod.trim()} - ref: ${refNumber}. Awaiting donor confirmation.`,
            adminUser?.user_id ?? resolvedAdminId,
        ]);

        // Notify the donor - they need to confirm
        await pool.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date) VALUES (?, ?, ?, ?, 'Donor', NOW())`,
            [
                'Fund Distribution Pending Your Approval',
                `The admin has initiated a fund distribution of $${Number(amount).toFixed(2)} to you via ${paymentMethod.trim()}. Reference: ${refNumber}. Please review and confirm or reject it in your Fund Distributions page.`,
                'fund_distribution',
                donorUserId
            ]
        );

        // Notify the admin - waiting for donor
        await pool.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date) VALUES (?, ?, ?, NULL, NOW())`,
            [
                'Distribution Sent - Awaiting Donor Confirmation',
                `You initiated a $${Number(amount).toFixed(2)} distribution to "${donorName.trim()}" (Ref: ${refNumber}). Waiting for donor to confirm receipt.`,
                'fund_distribution'
            ]
        );

        res.status(201).json({
            message: 'Distribution initiated. Waiting for donor confirmation.',
            distributionId: insertResult.insertId,
            referenceNumber: refNumber
        });
    } catch (err) {
        console.error('POST /api/admin/fund-distribution error:', err);
        res.status(500).json({ error: 'Failed to create distribution record: ' + err.message });
    }
});

// ==============================================================
// ──────────────── Admin Profile Page ──────────────────────────
// ==============================================================

// ─────────────────────────────────────────────────────────────
// GET /api/admin/profile/:userId
// Loads the admin's own profile data (name, email, phone, picture, joined date).
// Joins User + Admin to confirm the user is actually an admin.
// ─────────────────────────────────────────────────────────────
app.get('/api/admin/profile/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [[profile]] = await pool.query(`
            SELECT
                u.user_id,
                u.name,
                u.email,
                u.phone_number,
                u.profile_picture,
                u.status,
                u.created_at AS joined_date,
                a.admin_id
            FROM User u
            JOIN Admin a ON a.user_id = u.user_id
            WHERE u.user_id = ?
            LIMIT 1
        `, [userId]);

        if (!profile) {
            return res.status(404).json({ error: 'Admin profile not found.' });
        }

        res.json({ profile });
    } catch (err) {
        console.error('GET /api/admin/profile error:', err);
        res.status(500).json({ error: 'Failed to load admin profile.' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/change-password/:userId
// Verifies the admin's current password with bcrypt, then hashes and stores the new one.
// Password rule: 3-10 characters.
// ─────────────────────────────────────────────────────────────
app.put('/api/admin/change-password/:userId', async (req, res) => {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Validate length before touching the DB
    if (!newPassword || newPassword.length < 3 || newPassword.length > 10) {
        return res.status(400).json({ error: 'New password must be between 3 and 10 characters.' });
    }

    try {
        // Fetch the stored bcrypt hash
        const [[user]] = await pool.query(
            'SELECT password FROM User WHERE user_id = ?',
            [userId]
        );

        if (!user) return res.status(404).json({ error: 'Admin not found.' });

        // Compare typed password against the stored hash
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        // Hash the new password (10 salt rounds, same as registration)
        const newHash = await bcrypt.hash(newPassword, 10);

        // Save the new hash
        await pool.query('UPDATE User SET password = ? WHERE user_id = ?', [newHash, userId]);

        // Audit log
        await pool.query(
            'INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)',
            ['Password Change', 'Admin changed their password', userId]
        );

        // Notification
        await pool.query(
            'INSERT INTO Notifications (message_title, message, type, user_id) VALUES (?, ?, ?, ?)',
            [
                'Password Changed',
                'Your account password has been changed successfully. If you did not make this change, please contact support immediately.',
                'profile_update',
                userId
            ]
        );

        res.json({ message: 'Password changed successfully.' });
    } catch (err) {
        console.error('PUT /api/admin/change-password error:', err);
        res.status(500).json({ error: 'Failed to change password.' });
    }
});


// POST /api/admin/upload-profile-picture/:userId
// Receives a file via multer (field name: "profilePicture"), saves it to disk,
// then stores the relative URL in User.profile_picture.
app.post('/api/admin/upload-profile-picture/:userId', upload.single('profilePicture'), async (req, res) => {
    const { userId } = req.params;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    // The relative URL is what gets stored in the DB and served statically
    const imageUrl = `/uploads/${req.file.filename}`;

    try {
        await pool.query('UPDATE User SET profile_picture = ? WHERE user_id = ?', [imageUrl, userId]);

        // Notification so the admin sees it in the notifications page
        await pool.query(
            `INSERT INTO Notifications (message_title, message, type, user_id) VALUES (?, ?, ?, ?)`,
            ['Profile Picture Updated', 'Your profile picture has been successfully changed.', 'profile_update', userId]
        );

        // Return the new URL so the frontend can update the avatar immediately without a reload
        res.json({ profile_picture: imageUrl });
    } catch (err) {
        console.error('POST /api/admin/upload-profile-picture error:', err);
        res.status(500).json({ error: 'Failed to save profile picture.' });
    }
});


// DELETE /api/admin/delete-profile-picture/:userId
// Deletes the image file from disk and sets profile_picture = NULL in the DB.
app.delete('/api/admin/delete-profile-picture/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Get the current picture path so we can delete the file from disk
        const [[user]] = await pool.query('SELECT profile_picture FROM User WHERE user_id = ?', [userId]);

        if (user && user.profile_picture) {
            const filePath = path.join(__dirname, user.profile_picture);
            // Only delete the file if it physically exists on disk
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        // Set the column to NULL in the DB
        await pool.query('UPDATE User SET profile_picture = NULL WHERE user_id = ?', [userId]);

        // Notification
        await pool.query(
            `INSERT INTO Notifications (message_title, message, type, user_id) VALUES (?, ?, ?, ?)`,
            ['Profile Picture Removed', 'Your profile picture has been removed.', 'profile_update', userId]
        );

        res.json({ message: 'Profile picture deleted.' });
    } catch (err) {
        console.error('DELETE /api/admin/delete-profile-picture error:', err);
        res.status(500).json({ error: 'Failed to delete profile picture.' });
    }
});

// ==============================================================
// ──────────────── Admin Notifications Page ────────────────────
// ==============================================================


// ── GET /api/admin/notifications ──────────────────────────────
app.get('/api/admin/notifications', async (req, res) => {
    const { userId } = req.query;   // frontend will send admin's user_id
    try {
        let query = `
            SELECT
                n.notification_id,
                n.message_title,
                n.message,
                n.type,
                n.read_at,
                n.date,
                n.user_id
            FROM Notifications n
            WHERE n.type IN (
                'new_registration', 'new_offer', 'offer_accepted',
                'money_donation', 'fund_distribution',
                'volunteer_assigned', 'delivery_completed', 'feedback_submitted',
                'contact_message', 'offer_expired', 'offer_cancelled',
                'money_request', 'profile_update', 'money_request_approved',
                'money_request_rejected', 'expiration_alert',
                'assignment_request', 'assignment_response'
            )
        `;
        const params = [];
        if (userId) {
            query += ` AND (n.user_id IS NULL OR n.user_id = ?)`;
            params.push(userId);
        } else {
            query += ` AND n.user_id IS NULL`;
        }
        query += ` ORDER BY n.date DESC`;
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('GET /api/admin/notifications error:', err);
        res.status(500).json({ error: 'Failed to load notifications.' });
    }
});


// ── PUT /api/admin/notifications/mark-all-read ────────────────
app.put('/api/admin/notifications/mark-all-read', async (req, res) => {
    const { userId } = req.body;   // send admin's userId in the body
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    try {
        await pool.query(`
            UPDATE Notifications
            SET read_at = NOW()
            WHERE (user_id IS NULL OR user_id = ?)
            AND read_at IS NULL
        `, [userId]);
        res.json({ message: 'All notifications marked as read.' });
    } catch (err) {
        console.error('PUT /api/admin/notifications/mark-all-read error:', err);
        res.status(500).json({ error: 'Failed to mark notifications as read.' });
    }
});


// ── PUT /api/admin/notifications/:id/read ─────────────────────
// Marks a single notification as read (used when the admin clicks one item).
app.put('/api/admin/notifications/:id/read', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`
            UPDATE Notifications
            SET read_at = NOW()
            WHERE notification_id = ? AND read_at IS NULL
        `, [id]);
        res.json({ message: 'Notification marked as read.' });
    } catch (err) {
        console.error('PUT /api/admin/notifications/:id/read error:', err);
        res.status(500).json({ error: 'Failed to update notification.' });
    }
});

// ── DELETE /api/admin/notifications/delete-all ────────────────
// Permanently deletes ALL notification records from the table.
// The admin is shown a confirmation dialog on the frontend before this fires.
app.delete('/api/admin/notifications/delete-all', async (req, res) => {
    try {
        await pool.query(`DELETE FROM Notifications`);
        res.json({ message: 'All notifications deleted.' });
    } catch (err) {
        console.error('DELETE /api/admin/notifications/delete-all error:', err);
        res.status(500).json({ error: 'Failed to delete notifications.' });
    }
});

// ── DELETE /api/admin/notifications/:notificationId ───────────
// Permanently deletes a single notification by its ID.
app.delete("/api/admin/notifications/:notificationId", async (req, res) => {
    const { notificationId } = req.params;

    try {
        const [result] = await pool.query(
            "DELETE FROM Notifications WHERE notification_id = ?",
            [notificationId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Notification not found." });
        }

        res.json({ message: "Notification deleted successfully." });
    } catch (err) {
        console.error("DELETE /api/admin/notifications/:notificationId error:", err);
        res.status(500).json({ error: "Failed to delete notification." });
    }
});

// ── GET /api/admin/notifications/unread-count/:userId ─────────
// Returns the count of unread admin-level notifications.
app.get('/api/admin/notifications/unread-count/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [[row]] = await pool.query(`
            SELECT COUNT(*) AS count
            FROM Notifications
            WHERE (user_id IS NULL OR user_id = ?)
              AND read_at IS NULL
        `, [userId]);
        res.json({ count: row.count });
    } catch (err) {
        console.error('GET /api/admin/notifications/unread-count/:userId error:', err);
        res.json({ count: 0 });
    }
});

// ==============================================================
// ──────────────── ADMIN DELIVERIES API ─────────────────────────
// ==============================================================

// Helper: calculate distance in km between two lat/lng points using Haversine formula
// const calculateDistance = (lat1, lon1, lat2, lon2) => {
//     if (!lat1 || !lon1 || !lat2 || !lon2) return null;
//     const R = 6371; // Earth's radius in km
//     const dLat = (lat2 - lat1) * Math.PI / 180;
//     const dLon = (lon2 - lon1) * Math.PI / 180;
//     const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
//               Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
//               Math.sin(dLon/2) * Math.sin(dLon/2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//     return Math.round(R * c * 10) / 10; // round to 1 decimal
// };



const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Treat missing or zero coordinates as invalid
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    if (Math.abs(lat1) < 0.0001 && Math.abs(lon1) < 0.0001) return null;
    if (Math.abs(lat2) < 0.0001 && Math.abs(lon2) < 0.0001) return null;

    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let dist = R * c;
    // If the distance is extremely small (e.g., both points are 0,0), treat as invalid
    if (dist < 0.01) return null;
    return Math.round(dist * 10) / 10;
};

// ──── GET /api/admin/deliveries ─────────────────────────────────
// Returns all deliveries with full details: offer, donor, receiver, volunteer, status, distance.
app.get('/api/admin/deliveries', async (req, res) => {
    try {
        // Query accepted food offers with donor, receiver, address details
        // Left join Delivery and Volunteer to get volunteer info and delivery status
        const [rows] = await pool.query(`
            SELECT
                fo.offer_id,
                fo.food_name,
                fo.status AS offer_status,
                fo.pickup_time,
                -- Donor info (using Donor.address_id)
                donor_user.name AS donor_name,
                donor_addr.street AS donor_street,
                donor_addr.city AS donor_city,
                donor_addr.country AS donor_country,
                donor_addr.latitude AS donor_lat,
                donor_addr.longitude AS donor_lon,
                -- Receiver info (via Receiver_location → Address)
                receiver_user.name AS receiver_name,
                receiver_addr.street AS receiver_street,
                receiver_addr.city AS receiver_city,
                receiver_addr.country AS receiver_country,
                receiver_addr.latitude AS receiver_lat,
                receiver_addr.longitude AS receiver_lon,
                -- Delivery info (distance_km column does NOT exist in your Delivery table; omit it)
                d.delivery_id,
                d.delivery_status,
                d.delivery_time AS delivered_time,
                -- Volunteer info
                vol_user.name AS volunteer_name,
                vol_user.profile_picture AS volunteer_profile_photo
            FROM Food_offer fo
            -- Donor join : correct - use Donor.address_id
            JOIN Donor dnr ON fo.donor_id = dnr.donor_id
            JOIN User donor_user ON dnr.user_id = donor_user.user_id
            JOIN Address donor_addr ON dnr.address_id = donor_addr.address_id
            -- Receiver join : correct - via Receiver_location
            LEFT JOIN Receiver rc ON fo.receiver_id = rc.receiver_id
            LEFT JOIN User receiver_user ON rc.user_id = receiver_user.user_id
            LEFT JOIN Receiver_location rl ON rc.receiver_id = rl.receiver_id
            LEFT JOIN Address receiver_addr ON rl.address_id = receiver_addr.address_id
            -- Delivery (if exists) and Volunteer
            LEFT JOIN Delivery d ON fo.offer_id = d.offer_id
            LEFT JOIN Volunteer v ON d.volunteer_id = v.volunteer_id
            LEFT JOIN User vol_user ON v.user_id = vol_user.user_id
            WHERE fo.receiver_id IS NOT NULL              -- Only accepted offers
              AND fo.status NOT IN ('available', 'expired')
            ORDER BY fo.offer_id DESC
        `);

        // Process rows: compute distance, map status
        const deliveries = rows.map(row => {
            let status = 'pending_pickup';
            // Determine status based on delivery_status and offer_status
            if (row.offer_status === 'cancelled') {
                status = 'cancelled';
            } else if (row.delivery_status === 'completed') {
                status = 'delivered';
            } else if (row.delivery_status === 'in_delivery') {
                status = 'in_delivery';
            } else if (row.delivery_status === 'assigned') {
                status = 'pending_pickup';
            } else if (!row.delivery_id && row.offer_status === 'accepted') {
                status = 'pending_pickup';
            } else if (row.offer_status === 'delivered') {
                status = 'delivered';
            }

            // Compute distance from donor and receiver lat/lng (since distance_km doesn't exist)
            let distance = null;
            if (row.donor_lat && row.donor_lon && row.receiver_lat && row.receiver_lon) {
                distance = calculateDistance(row.donor_lat, row.donor_lon, row.receiver_lat, row.receiver_lon);
            }

            return {
                delivery_id: row.delivery_id,
                offer_id: row.offer_id,
                food_name: row.food_name,
                donor_name: row.donor_name,
                donor_address: `${row.donor_street || ''}, ${row.donor_city || ''}, ${row.donor_country || ''}`.replace(/^, |, ,/, ''),
                receiver_name: row.receiver_name,
                receiver_address: `${row.receiver_street || ''}, ${row.receiver_city || ''}, ${row.receiver_country || ''}`.replace(/^, |, ,/, ''),
                volunteer_name: row.volunteer_name || null,
                volunteer_profile_photo: row.volunteer_profile_photo || null,
                status: status,
                distance_km: distance,
                pickup_time: row.pickup_time,
                delivered_time: row.delivered_time
            };
        });

        res.json({ deliveries });
    } catch (err) {
        console.error('GET /api/admin/deliveries error:', err);
        res.status(500).json({ error: 'Failed to fetch deliveries.' });
    }
});


// ==============================================================
// ──────────────── ADMIN: DASHBOARD Page ──────────────────────
// ==============================================================


// ──────────────── ADMIN: DASHBOARD STATS ──────────────────────

// GET /api/admin/dashboard/stats
// Returns:
//   stats            { total_donations_kg, active_volunteers, pending_requests, meals_delivered }
//   userDistribution [ { name: 'Donor'|'Receiver'|'Volunteer', value: N }, … ]
//   recentActivity   [ { name, role, action, status, profile_picture, created_at }, … ]

app.get('/api/admin/dashboard/stats', async (req, res) => {
    try {
        const [[{ total_donations_kg }]] = await pool.query(`
            SELECT COALESCE(SUM(fo.quantity_by_kg), 0) AS total_donations_kg
            FROM Food_offer fo
            WHERE fo.status IN ('accepted', 'in_delivery', 'delivered')
        `);

        const [[{ active_volunteers }]] = await pool.query(`
            SELECT COUNT(DISTINCT v.volunteer_id) AS active_volunteers
            FROM Volunteer v
            JOIN Delivery d ON d.volunteer_id = v.volunteer_id
            WHERE d.delivery_status IN ('delivery_accepted', 'in_delivery')
        `);

        const [[{ pending_requests }]] = await pool.query(`
            SELECT COUNT(*) AS pending_requests
            FROM Food_offer
            WHERE status = 'available'
        `);

        const [[{ meals_delivered }]] = await pool.query(`
            SELECT COUNT(*) AS meals_delivered
            FROM Delivery
            WHERE delivery_status IN ('delivered', 'completed')
        `);

        const [roleRows] = await pool.query(`
            SELECT r.role_name AS role, COUNT(DISTINCT ur.user_id) AS cnt
            FROM User_Role ur
            JOIN Role r ON r.role_id = ur.role_id
            WHERE r.role_name IN ('Donor', 'Receiver', 'Volunteer')
            GROUP BY r.role_name
        `);

        const userDistribution = ['Donor', 'Receiver', 'Volunteer'].map(name => ({
            name,
            value: Number(roleRows.find(r => r.role === name)?.cnt ?? 0),
        }));

        // ─────────────────────────────────────────────────────────
        // RECENT ACTIVITY – ONLY the actions you explicitly want
        // ─────────────────────────────────────────────────────────
        const [activityRows] = await pool.query(`
            SELECT
                u.name,
                u.profile_picture,
                u.status,
                r.role_name AS role,
                sl.action,
                sl.description,
                sl.timestamp AS action_time
            FROM Syslog sl
            JOIN User u ON u.user_id = sl.user_id
            JOIN Role r ON r.user_id = u.user_id
            WHERE r.role_name IN ('Donor', 'Receiver', 'Volunteer')
            AND (
                (r.role_name = 'Donor' AND sl.action IN ('Create Offer', 'Donation', 'Registration', 'EmailVerified'))
                OR
                (r.role_name = 'Volunteer' AND sl.action IN ('Registration', 'EmailVerified', 'VOLUNTEER_ACCEPT_DELIVERY', 'VOLUNTEER_START_DELIVERY', 'VOLUNTEER_COMPLETE_DELIVERY'))
                OR
                (r.role_name = 'Receiver' AND sl.action IN ('Registration', 'EmailVerified','Cancel Offer', 'Accept Offer' , 'Feedback'))
            )
            ORDER BY sl.timestamp DESC
            LIMIT 15
        `);

        const recentActivity = activityRows.map(row => ({
            name: row.name,
            role: row.role,
            action: row.action,
            status: row.status,
            profile_picture: row.profile_picture,
            created_at: row.action_time,
        }));

        res.json({
            stats: {
                total_donations_kg: Number(total_donations_kg).toFixed(2),
                active_volunteers: Number(active_volunteers),
                pending_requests: Number(pending_requests),
                meals_delivered: Number(meals_delivered),
            },
            userDistribution,
            recentActivity,
        });

    } catch (err) {
        console.error('GET /api/admin/dashboard/stats error:', err);
        res.status(500).json({ error: 'Failed to load dashboard stats.' });
    }
});



// ──────────────── ADMIN: DONATION TRENDS ──────────────────────

// GET /api/admin/dashboard/trends?filter=Today|This Month|This Year|Last Year
// Returns:
//   trends  [ { label: string, value: number }, … ]

app.get('/api/admin/dashboard/trends', async (req, res) => {
    const filter = req.query.filter || 'This Month';

    try {
        let rows = [];

        if (filter === 'Today') {
            // Group by hour (0–23)
            [rows] = await pool.query(`
                SELECT
                    HOUR(created_at)                          AS period,
                    COALESCE(SUM(quantity_by_kg), 0)          AS value
                FROM Food_offer
                WHERE DATE(created_at) = CURDATE()
                AND status IN ('accepted', 'in_delivery', 'delivered')
                GROUP BY period
                ORDER BY period ASC
            `);
            // Fill all 24 hours
            const map = Object.fromEntries(rows.map(r => [r.period, Number(r.value)]));
            const trends = Array.from({ length: 24 }, (_, h) => ({
                label: `${String(h).padStart(2, '0')}:00`,
                value: map[h] ?? 0,
            }));
            return res.json({ trends });

        } else if (filter === 'This Month') {
            // Group by day-of-month
            [rows] = await pool.query(`
                SELECT
                    DAY(created_at)                          AS period,
                    COALESCE(SUM(quantity_by_kg), 0)         AS value
                FROM Food_offer
                WHERE YEAR(created_at)  = YEAR(NOW())
                AND MONTH(created_at) = MONTH(NOW())
                AND status IN ('accepted', 'in_delivery', 'delivered')
                GROUP BY period
                ORDER BY period ASC
            `);
            const map = Object.fromEntries(rows.map(r => [r.period, Number(r.value)]));
            const daysInMonth = new Date(
                new Date().getFullYear(), new Date().getMonth() + 1, 0
            ).getDate();
            const trends = Array.from({ length: daysInMonth }, (_, i) => ({
                label: String(i + 1),
                value: map[i + 1] ?? 0,
            }));
            return res.json({ trends });

        } else if (filter === 'This Year') {
            // Group by month Jan–Dec
            const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            [rows] = await pool.query(`
                SELECT
                    MONTH(created_at)                        AS period,
                    COALESCE(SUM(quantity_by_kg), 0)         AS value
                FROM Food_offer
                WHERE YEAR(created_at) = YEAR(NOW())
                AND status IN ('accepted', 'in_delivery', 'delivered')
                GROUP BY period
                ORDER BY period ASC
            `);
            const map = Object.fromEntries(rows.map(r => [r.period, Number(r.value)]));
            const trends = MONTHS.map((label, i) => ({ label, value: map[i + 1] ?? 0 }));
            return res.json({ trends });

        } else if (filter === 'Last Year') {
            // Group by month for the previous calendar year
            const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            [rows] = await pool.query(`
                SELECT
                    MONTH(created_at)                        AS period,
                    COALESCE(SUM(quantity_by_kg), 0)         AS value
                FROM Food_offer
                WHERE YEAR(created_at) = YEAR(NOW()) - 1
                AND status IN ('accepted', 'in_delivery', 'delivered')
                GROUP BY period
                ORDER BY period ASC
            `);
            const map = Object.fromEntries(rows.map(r => [r.period, Number(r.value)]));
            const trends = MONTHS.map((label, i) => ({ label, value: map[i + 1] ?? 0 }));
            return res.json({ trends });
        }

        // Fallback
        return res.json({ trends: [] });

    } catch (err) {
        console.error('GET /api/admin/dashboard/trends error:', err);
        res.status(500).json({ error: 'Failed to load trend data.' });
    }
});


// ────────────────────────────── NEWWWW ──────────────────────────────────

// ==============================================================
// ──────────────── DONOR REQUEST MONEY (Fund Distribution) ─────
// ==============================================================

// ─── Donor: create a money request ─────────────────────────────
app.post("/api/donor/request-money", async (req, res) => {
    const { amount, reason, userId } = req.body;
    if (!amount || amount <= 0 || !reason?.trim() || !userId) {
        return res.status(400).json({ error: "Amount, reason and user ID are required." });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [donorRows] = await conn.query("SELECT donor_id FROM Donor WHERE user_id = ?", [userId]);
        if (donorRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: "Donor profile not found." });
        }
        const donorId = donorRows[0].donor_id;

        // Generate reference number: MR-20260423-00001
        const today = new Date();
        const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        const [[{ lastId }]] = await conn.query("SELECT COALESCE(MAX(request_id),0) AS lastId FROM money_request");
        const refNumber = `MR-${datePart}-${String(Number(lastId) + 1).padStart(5, '0')}`;

        await conn.query(
            `INSERT INTO money_request (amount, reason, status, request_date, reference_number, donor_id)
             VALUES (?, ?, 'pending', NOW(), ?, ?)`,
            [amount, reason.trim(), refNumber, donorId]
        );

        // Fetch donor's name from User table
        const [[donorUser]] = await conn.query(
            "SELECT name FROM User WHERE user_id = ?",
            [userId]
        );
        const donorName = donorUser ? donorUser.name : 'Unknown Donor';
        // Notify admin
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
            VALUES (?, ?, ?, NULL, NOW())`,
            [
                'New Money Request',
                `Donor "${donorName}" requested $${amount} for: ${reason.substring(0, 100)}`,
                'money_request'
            ]
        );



        await conn.commit();
        res.status(201).json({ message: "Request submitted.", referenceNumber: refNumber });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: "Failed to submit request." });
    } finally {
        conn.release();
    }
});


// ─── Donor: get completed distributions (no pending) ───────────
app.get("/api/donor/fund-distributions/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const [[donorRow]] = await pool.query("SELECT donor_id FROM Donor WHERE user_id = ?", [userId]);
        if (!donorRow) return res.status(404).json({ error: "Donor not found." });
        const donorId = donorRow.donor_id;

        const [distributions] = await pool.query(`
            SELECT
                fd.distribution_id,
                fd.amount,
                fd.distribution_date,
                fd.payment_method,
                fd.status,
                fd.purpose,
                fd.reference_number,
                fd.reviewed_at,
                'System Admin' AS donor_name
            FROM Fund_Distribution fd
            WHERE fd.donor_id = ? AND fd.status = 'completed'
            ORDER BY fd.distribution_date DESC
        `, [donorId]);

        res.json(distributions);
    } catch (error) {
        console.error('GET /api/donor/fund-distributions error:', error);
        res.status(500).json({ error: 'Failed to fetch distributions.' });
    }
});


// ─── Donor: get pending requests (optional, for their own history) ──
app.get("/api/donor/money-requests/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const [[donor]] = await pool.query("SELECT donor_id FROM Donor WHERE user_id = ?", [userId]);
        if (!donor) return res.status(404).json({ error: "Donor not found." });

        const [rows] = await pool.query(`
            SELECT request_id, amount, reason, status, request_date, reference_number, rejection_reason, reviewed_at
            FROM money_request
            WHERE donor_id = ?
            ORDER BY request_date DESC
        `, [donor.donor_id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch requests." });
    }
});


// ==============================================================
// ──────────────── ADMIN: MANAGE MONEY REQUESTS ────────────────
// ==============================================================

// ─── Admin: get all pending money requests ───────────────────
app.get("/api/admin/money-requests", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT mr.request_id, mr.amount, mr.reason, mr.status, mr.request_date,
                mr.reference_number, mr.rejection_reason, mr.reviewed_at,
                u.name AS donor_name, d.donor_id, u.user_id AS donor_user_id
            FROM money_request mr
            JOIN Donor d ON mr.donor_id = d.donor_id
            JOIN User u ON d.user_id = u.user_id
            WHERE mr.status = 'pending'
            ORDER BY mr.request_date DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('GET /api/admin/money-requests error:', err);
        res.status(500).json({ error: 'Failed to load requests.' });
    }
});

// ─── Admin: approve a request - auto-create completed distribution ──
app.put("/api/admin/money-requests/:id/approve", async (req, res) => {
    const { id } = req.params;
    const { adminId, paymentMethod } = req.body; // adminId from frontend, paymentMethod optional

    if (!paymentMethod) return res.status(400).json({ error: "Payment method is required." });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[request]] = await conn.query(`
            SELECT mr.amount, mr.reason, mr.donor_id, d.user_id AS donor_user_id,
                mr.reference_number AS request_ref
            FROM money_request mr
            JOIN Donor d ON mr.donor_id = d.donor_id
            WHERE mr.request_id = ? AND mr.status = 'pending'
        `, [id]);

        if (!request) {
            await conn.rollback();
            return res.status(404).json({ error: "Request not found or already processed." });
        }


        // --- Balance check before approving ---
        const [[{ totalCollected }]] = await conn.query(
            `SELECT COALESCE(SUM(amount), 0) AS totalCollected FROM Money_donation WHERE status = 'approved'`
        );
        const [[{ totalDistributed }]] = await conn.query(
            `SELECT COALESCE(SUM(amount), 0) AS totalDistributed FROM Fund_Distribution WHERE status IN ('pending', 'completed')`
        );
        const availableBalance = Number(totalCollected) - Number(totalDistributed);
        if (Number(request.amount) > availableBalance) {
            await conn.rollback();
            return res.status(400).json({
                error: `Insufficient balance. Requested: $${Number(request.amount).toFixed(2)}, Available: $${availableBalance.toFixed(2)}`
            });
        }

        // Fetch donor name for better notification message
        const [[donorInfo]] = await conn.query(
            "SELECT name FROM User WHERE user_id = ?",
            [request.donor_user_id]  // request.donor_user_id is the user_id of the donor
        );
        const donorName = donorInfo ? donorInfo.name : `Donor ID ${request.donor_id}`;

        // 1. Update request status to 'approved'
        await conn.query(
            `UPDATE money_request SET status = 'approved', reviewed_at = NOW() WHERE request_id = ?`,
            [id]
        );

        // 2. Create completed distribution (no donor approval)
        const today = new Date();
        const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        const [[{ lastDistId }]] = await conn.query("SELECT COALESCE(MAX(distribution_id),0) AS lastDistId FROM Fund_Distribution");
        const distRef = `FD-${datePart}-${String(Number(lastDistId) + 1).padStart(5, '0')}`;

        let resolvedAdminId = null;
        if (adminId) {
            const [[adminRow]] = await conn.query("SELECT admin_id FROM Admin WHERE admin_id = ?", [adminId]);
            if (adminRow) resolvedAdminId = adminRow.admin_id;
        }
        if (!resolvedAdminId) {
            const [[fallback]] = await conn.query("SELECT admin_id FROM Admin LIMIT 1");
            resolvedAdminId = fallback?.admin_id;
        }

        await conn.query(`
            INSERT INTO Fund_Distribution
            (amount, distribution_date, payment_method, status, purpose, admin_id, donor_id, reference_number)
            VALUES (?, CURDATE(), ?, 'completed', ?, ?, ?, ?)
        `, [request.amount, paymentMethod, `Approved request: ${request.reason}`, resolvedAdminId, request.donor_id, distRef]);

        // 3. Notify donor
        await conn.query(`
            INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
            VALUES (?, ?, ?, ?, 'Donor', NOW())
        `, [
            'Money Request Approved',
            `Your request for $${request.amount} (${request.reason}) has been approved. Funds have been sent. Reference: ${distRef}`,
            'fund_distribution',
            request.donor_user_id
        ]);

        // Notify the admin that they approved the request
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
            VALUES (?, ?, ?, NULL , NOW())`,
            [
                'Money Request Approved',
                `You approved $${request.amount} request from ${donorName}. Ref: ${distRef}`,
                'money_request_approved'
            ]
        );


        await conn.commit();
        res.json({ message: "Request approved, funds distributed.", distributionRef: distRef });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: "Failed to approve request." });
    } finally {
        conn.release();
    }
});

// ─── Admin: reject a request ──────────────────────────────────
app.put("/api/admin/money-requests/:id/reject", async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: "Rejection reason required." });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[request]] = await conn.query(`
            SELECT mr.amount, mr.donor_id, d.user_id AS donor_user_id
            FROM money_request mr
            JOIN Donor d ON mr.donor_id = d.donor_id
            WHERE mr.request_id = ? AND mr.status = 'pending'
        `, [id]);

        if (!request) {
            await conn.rollback();
            return res.status(404).json({ error: "Request not found or already processed." });
        }

        const [[donorInfo]] = await conn.query(
            "SELECT name FROM User WHERE user_id = ?",
            [request.donor_user_id]
        );
        const donorName = donorInfo ? donorInfo.name : `Donor ID ${request.donor_id}`;

        await conn.query(`
            UPDATE money_request
            SET status = 'rejected', rejection_reason = ?, reviewed_at = NOW()
            WHERE request_id = ?
        `, [reason.trim(), id]);

        await conn.query(`
            INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
            VALUES (?, ?, ?, ?, 'Donor', NOW())
        `, [
            'Money Request Rejected',
            `Your request was rejected. Reason: ${reason}`,
            'money_request',
            request.donor_user_id
        ]);


        // Notify the admin that they rejected the request
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
            VALUES (?, ?, ?, NULL, NOW())`,
            [
                'Money Request Rejected',
                `You rejected $${request.amount} request from ${donorName}.`,
                'money_request_rejected'
            ]
        );

        await conn.commit();
        res.json({ message: "Request rejected." });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: "Failed to reject request." });
    } finally {
        conn.release();
    }
});





// ==============================================================
// ──────────────── EXPIRATION ALERTS ──────────────────────────
// ==============================================================
// ─── Helper: check for offers about to expire ─────────────────
async function checkExpiringOffers() {
    const conn = await pool.getConnection();
    try {
        // Find offers that:
        //   - status is 'available' or 'accepted' (assigned to receiver but no volunteer yet)
        //   - no active delivery (i.e. no volunteer assigned at all)
        //   - expiration date is within next 24 hours, but not already expired
        //   - no recent alert for this offer (last 24h)
        const [offersToAlert] = await conn.query(`
            SELECT
                fo.offer_id,
                fo.food_name,
                fo.expiration_date_and_time,
                fo.donor_id
            FROM Food_offer fo
            WHERE fo.status IN ('available', 'accepted')
              AND NOT EXISTS (
                  SELECT 1 FROM Delivery d
                  WHERE d.offer_id = fo.offer_id
                    AND d.delivery_status IN ('in_delivery', 'completed')
              )
              AND fo.expiration_date_and_time <= DATE_ADD(NOW(), INTERVAL 24 HOUR)
              AND fo.expiration_date_and_time > NOW()
              AND NOT EXISTS (
                  SELECT 1 FROM expiration_alert ea
                  WHERE ea.offer_id = fo.offer_id
                    AND ea.alert_time > NOW() - INTERVAL 24 HOUR
              )
        `);

        if (offersToAlert.length === 0) {
            return;
        }

        for (const offer of offersToAlert) {
            const message = `Food offer "${offer.food_name}" (ID: ${offer.offer_id}) is about to expire on ${new Date(offer.expiration_date_and_time).toLocaleString()}. No volunteer has been assigned yet. Please take action.`;

            // Get any existing admin ID (e.g., the first admin in the table)
            const [[adminRow]] = await conn.query(
                "SELECT admin_id FROM Admin LIMIT 1"
            );
            const adminId = adminRow ? adminRow.admin_id : 1; // fallback to 1 if no admin found

            // 1. Insert into expiration_alert table 
            await conn.query(
                `INSERT INTO expiration_alert (alert_time, message, admin_id, offer_id)
                VALUES (NOW(), ?, ?, ?)`,
                [message, adminId, offer.offer_id]
            );

             // 2. Insert into Notifications table (admin notification, user_id = NULL)
            await conn.query(
                `INSERT INTO Notifications (message_title, message, type, user_id, date)
                VALUES (?, ?, ?, NULL, NOW())`,
                ['Expiration Alert⚠️', message, 'expiration_alert']
            );


        }
    } catch (err) {
        console.error('[CRON] Error checking expiring offers:', err);
    } finally {
        conn.release();
    }
}

// Run every 30 minutes (you can adjust the schedule)
cron.schedule('*/30 * * * *', checkExpiringOffers);

// Also run immediately on server start
checkExpiringOffers();


// ─── GET /api/admin/expiration-alerts ─────────────────────────
app.get('/api/admin/expiration-alerts', async (req, res) => {
    try {
        // Once the underlying offer has actually expired (status='expired' or
        // its expiration_date_and_time has passed) the "about-to-expire" alert
        // is no longer relevant — drop it from the dashboard alert box.
        await pool.query(`
            DELETE ea FROM expiration_alert ea
            JOIN Food_offer fo ON ea.offer_id = fo.offer_id
            WHERE fo.status = 'expired'
               OR (fo.expiration_date_and_time IS NOT NULL
                   AND fo.expiration_date_and_time <= NOW())
        `);

        const [rows] = await pool.query(`
            SELECT
                ea.alert_id,
                ea.alert_time,
                ea.message,
                ea.offer_id,
                fo.food_name,
                fo.expiration_date_and_time AS expiration_date,
                fo.status                   AS offer_status,
                fo.receiver_id
            FROM expiration_alert ea
            JOIN Food_offer fo ON ea.offer_id = fo.offer_id
            WHERE fo.status <> 'expired'
              AND (fo.expiration_date_and_time IS NULL
                   OR fo.expiration_date_and_time > NOW())
            ORDER BY ea.alert_time DESC
        `);
        res.json({ alerts: rows });
    } catch (err) {
        console.error('GET /api/admin/expiration-alerts error:', err);
        res.status(500).json({ error: 'Failed to fetch expiration alerts.' });
    }
});

// ─── DELETE /api/admin/expiration-alerts/:alertId ─────────────
app.delete('/api/admin/expiration-alerts/:alertId', async (req, res) => {
    const { alertId } = req.params;
    try {
        const [result] = await pool.query(
            'DELETE FROM expiration_alert WHERE alert_id = ?',
            [alertId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Alert not found.' });
        }
        res.json({ message: 'Alert dismissed successfully.' });
    } catch (err) {
        console.error('DELETE /api/admin/expiration-alerts error:', err);
        res.status(500).json({ error: 'Failed to dismiss alert.' });
    }
});



// ==============================================================
// ──────────────── Admin → Request a volunteer ─────────────────
// ==============================================================

// Admin requests a volunteer for an expiring offer
app.post('/api/admin/request-volunteer', async (req, res) => {
    const { offerId, volunteerUserId, message, adminId } = req.body;
    if (!offerId || !volunteerUserId) {
        return res.status(400).json({ error: 'Offer ID and Volunteer ID required.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Check that offer is ALREADY accepted by a receiver and no volunteer assigned.
        // 🛠 Fixed: previously also accepted status='available', which let admins
        //    dispatch a volunteer to an offer no receiver had claimed yet.
        const [[offer]] = await conn.query(
            `SELECT status, food_name, receiver_id FROM Food_offer WHERE offer_id = ?`,
            [offerId]
        );
        if (!offer) {
            await conn.rollback();
            return res.status(404).json({ error: 'Offer not found.' });
        }
        if (offer.status !== 'accepted' || !offer.receiver_id) {
            await conn.rollback();
            return res.status(409).json({
                error: 'A volunteer can only be assigned after a receiver has accepted this offer.'
            });
        }

        // Insert request
        const [result] = await conn.query(
            `INSERT INTO Volunteer_Assignment_Request
             (offer_id, volunteer_user_id, admin_message, status, admin_id, requested_at)
             VALUES (?, ?, ?, 'pending', ?, NOW())`,
            [offerId, volunteerUserId, message || null, adminId || null]
        );

        // Notify the volunteer
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, recipient_role, date)
             VALUES (?, ?, ?, ?, 'Volunteer', NOW())`,
            [
                'New Assignment Request',
                `Admin needs you to deliver "${offer.food_name}". Message: ${message || 'Please accept or reject this request.'}`,
                'assignment_request',
                volunteerUserId
            ]
        );

        // Notify admin (user_id = NULL) – fixed string syntax
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, NULL, NOW())`,
            [
                'Request Sent',
                `Request sent to volunteer (ID ${volunteerUserId}) for offer "${offer.food_name}".`,
                'assignment_request'
            ]
        );

        await conn.commit();
        res.status(201).json({ message: 'Request sent to volunteer.', requestId: result.insertId });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to send request.' });
    } finally {
        conn.release();
    }
});







// ==============================================================
// ──────────────── START SERVER ────────────────────────────────
// ==============================================================
// ==============================================================
// ──────────────── ADMIN AI SUMMARY (Gemini 2.0 Flash) ─────────
// ==============================================================

// flash-lite has the most generous free-tier daily quota (~1000 RPD)
// and lower contention, so we hit it first and keep flash as fallback.
const GEMINI_PRIMARY_MODEL  = 'gemini-2.5-flash-lite';
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash';

// Whether AI is configured at all. Cached so route guards stay cheap.
const hasGeminiKey = !!process.env.GEMINI_API_KEY;

// Build a fresh client + model on every call. The SDK rides on Node's
// global fetch (undici), which pools keep-alive sockets. After the
// server has been idle for hours, Google closes its side of the socket
// but undici still has it cached — the next call dies with
// "fetch failed" / "socket hang up" / ECONNRESET, and the only fix
// used to be restarting the process. Building fresh per request keeps
// no long-lived SDK state, so a stale socket can't poison later calls.
function makeGeminiModel(modelName) {
    if (!hasGeminiKey) return null;
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return client.getGenerativeModel({ model: modelName });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Call Gemini with retry on transient errors. Tries up to 4 times
// against the primary model with exponential backoff, then twice
// against the fallback model. Fresh model instance per attempt so
// any stale SDK/undici state gets dropped between tries.
async function callGeminiWithRetry(payload) {
    const tryOnce = async (modelName) => {
        try {
            const model = makeGeminiModel(modelName);
            return { ok: true, result: await model.generateContent(payload), label: modelName };
        } catch (err) {
            return { ok: false, err, label: modelName };
        }
    };

    // Treat both HTTP 5xx and connection-layer errors as transient. The
    // network-error patterns matter most for the long-uptime case where
    // undici's connection pool serves a closed socket.
    const isTransient = err => {
        const msg = err?.message || String(err);
        const cause = err?.cause?.message || '';
        const code = err?.code || err?.cause?.code || '';
        return (
            /\b50[234]\b|UNAVAILABLE|overloaded|high demand/i.test(msg) ||
            /fetch failed|socket hang up|network error|other side closed|terminated|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|EPIPE/i.test(msg + ' ' + cause) ||
            ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'EPIPE', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT'].includes(code)
        );
    };

    // Hit the per-model daily/minute quota? Don't retry the same model —
    // jump straight to the fallback (different model = separate quota bucket).
    const isQuotaExceeded = err => {
        const msg = err?.message || String(err);
        return /\b429\b|quota|exceeded|rate.?limit/i.test(msg);
    };

    let lastErr;
    for (let attempt = 1; attempt <= 4; attempt++) {
        const r = await tryOnce(GEMINI_PRIMARY_MODEL);
        if (r.ok) return r;
        lastErr = r.err;
        if (isQuotaExceeded(r.err)) {
            process.stdout.write(`[ai] Primary model quota exhausted — switching to ${GEMINI_FALLBACK_MODEL}\n`);
            break; // try fallback model immediately
        }
        if (!isTransient(r.err)) throw r.err;
        process.stdout.write(`[ai] transient error on attempt ${attempt}: ${r.err?.message || r.err}\n`);
        if (attempt < 4) await sleep(400 * attempt); // 400, 800, 1200ms
    }

    for (let attempt = 1; attempt <= 2; attempt++) {
        const fb = await tryOnce(GEMINI_FALLBACK_MODEL);
        if (fb.ok) return fb;
        lastErr = fb.err;
        if (!isTransient(fb.err) || isQuotaExceeded(fb.err)) break;
        if (attempt < 2) await sleep(600);
    }
    // Both models failed — surface the original error so the route handler
    // can map it to a user-friendly status.
    throw lastErr;
}

const ADMIN_SUMMARY_SYSTEM_PROMPT = `You are an analyst for FeedHope, a food donation platform serving Lebanon. Donors post surplus food, receivers (charities, shelters, families) accept it, and volunteers deliver it.

Your job: write a concise summary of platform activity from the structured JSON the user provides.

Strict rules:
1. Write 1-2 short paragraphs in plain English. Total ~120 words.
2. Use ONLY the numbers in the JSON. Never invent statistics.
3. When a "previous" period is given, compute the percent change vs "current" and call out notable shifts (>20% up or down).
4. If a value is 0 or null, say so naturally — don't hide it.
5. Mention the most active donor and the most popular category if their counts are above zero.
6. Tone: factual, neutral, conversational. No exclamation marks. No emojis.
7. Reference the period explicitly ("today", "this week", etc.).
8. End with one observation or risk if applicable (e.g. offers expiring without volunteers, low donation volume, deliveries lagging acceptance).

Output: just the paragraphs. No headings, no bullet lists, no markdown formatting.`;

// Compute MySQL-formatted date ranges for the current period and the
// comparable previous period (same window 7 days earlier).
function computeAdminPeriod(range) {
    const now = new Date();
    let from, to;

    if (range === 'this_week') {
        from = new Date(now); from.setDate(now.getDate() - 7);
        to = new Date(now);
    } else if (range === 'this_month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now);
    } else { // 'today' (default)
        from = new Date(now); from.setHours(0, 0, 0, 0);
        to = new Date(now);
    }

    const periodMs = to.getTime() - from.getTime();
    const previousFrom = new Date(from.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previousTo = new Date(previousFrom.getTime() + periodMs);

    // MySQL DATETIME columns are naive (no timezone) and stored in
    // server-local time. toISOString() returns UTC, which would shift
    // the window by your offset (e.g. 3h in Beirut) and miss today's
    // rows. Format in local time to match how rows were inserted.
    const pad = n => String(n).padStart(2, '0');
    const fmt = d =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return {
        label: range || 'today',
        current: { from: fmt(from), to: fmt(to) },
        previous: { from: fmt(previousFrom), to: fmt(previousTo) }
    };
}

async function aggregateAdminStats({ from, to }) {
    const [[offers]] = await pool.query(`
        SELECT
            COUNT(*)                                                                AS created,
            SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END)                      AS accepted,
            SUM(CASE WHEN status IN ('in_delivery','delivery_accepted') THEN 1 ELSE 0 END) AS in_progress,
            SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END)                     AS delivered,
            SUM(CASE WHEN status='expired' THEN 1 ELSE 0 END)                       AS expired,
            SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END)                     AS cancelled,
            COALESCE(SUM(quantity_by_kg), 0)                                        AS total_kg,
            COALESCE(SUM(number_of_person), 0)                                      AS people_fed
        FROM Food_offer
        WHERE created_at >= ? AND created_at < ?
    `, [from, to]);

    const [topDonors] = await pool.query(`
        SELECT u.name AS donor, COUNT(*) AS offers,
               COALESCE(SUM(fo.quantity_by_kg), 0) AS kg
        FROM Food_offer fo
        JOIN Donor d ON d.donor_id = fo.donor_id
        JOIN User  u ON u.user_id  = d.user_id
        WHERE fo.created_at >= ? AND fo.created_at < ?
        GROUP BY u.user_id, u.name
        ORDER BY offers DESC, kg DESC
        LIMIT 3
    `, [from, to]);

    const [byCategory] = await pool.query(`
        SELECT fc.category_name AS category, COUNT(*) AS count
        FROM Food_offer fo
        JOIN Food_category fc ON fc.category_id = fo.category_id
        WHERE fo.created_at >= ? AND fo.created_at < ?
        GROUP BY fc.category_name
        ORDER BY count DESC
        LIMIT 5
    `, [from, to]);

    const [[deliveries]] = await pool.query(`
        SELECT COUNT(*) AS completed
        FROM Delivery
        WHERE delivery_time >= ? AND delivery_time < ?
          AND delivery_status IN ('delivered', 'completed')
    `, [from, to]);

    const [[regs]] = await pool.query(`
        SELECT COUNT(*) AS new_users
        FROM User
        WHERE created_at >= ? AND created_at < ?
    `, [from, to]);

    return {
        offers: {
            created:     Number(offers.created     || 0),
            accepted:    Number(offers.accepted    || 0),
            in_progress: Number(offers.in_progress || 0),
            delivered:   Number(offers.delivered   || 0),
            expired:     Number(offers.expired     || 0),
            cancelled:   Number(offers.cancelled   || 0),
        },
        kilograms:            Number(offers.total_kg   || 0),
        people_fed:           Number(offers.people_fed || 0),
        deliveries_completed: Number(deliveries.completed || 0),
        new_users:            Number(regs.new_users || 0),
        top_donors:           topDonors.map(r => ({
            donor:  r.donor,
            offers: Number(r.offers),
            kg:     Number(r.kg),
        })),
        top_categories: byCategory.map(r => ({
            category: r.category,
            count:    Number(r.count),
        })),
    };
}

// POST /api/admin/ai/summary
// Body: { range?: 'today' | 'this_week' | 'this_month' }
// Returns: { summary: string, period: {...}, generated_at: ISO string, usage: {...} }
app.post('/api/admin/ai/summary', async (req, res) => {
    if (!hasGeminiKey) {
        return res.status(503).json({
            error: 'AI summary is not configured. Set GEMINI_API_KEY in backend/.env and restart the server.'
        });
    }

    try {
        const range = req.body?.range || 'today';
        const period = computeAdminPeriod(range);

        const [current, previous] = await Promise.all([
            aggregateAdminStats(period.current),
            aggregateAdminStats(period.previous),
        ]);

        const payload = { period, current, previous };

        const { result, label: modelUsed } = await callGeminiWithRetry({
            systemInstruction: { role: 'system', parts: [{ text: ADMIN_SUMMARY_SYSTEM_PROMPT }] },
            contents: [
                {
                    role: 'user',
                    parts: [{
                        text: `Period: ${range}\n\nData:\n${JSON.stringify(payload, null, 2)}`
                    }],
                },
            ],
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 1024,
            },
        });

        const summary = (result.response.text() || '').trim();
        const usage = result.response.usageMetadata || {};

        res.json({
            summary,
            period,
            generated_at: new Date().toISOString(),
            model: modelUsed,
            usage: {
                input_tokens:  usage.promptTokenCount     || 0,
                output_tokens: usage.candidatesTokenCount || 0,
                total_tokens:  usage.totalTokenCount      || 0,
            },
        });
    } catch (err) {
        // Surface the real reason so the dashboard shows something useful.
        const raw = err?.message || String(err);
        const status = err?.status || err?.statusCode
            || (/\b429\b|quota|rate/i.test(raw) ? 429
              : /\b401\b|API key not valid|invalid API key/i.test(raw) ? 401
              : /\b403\b|permission|disabled/i.test(raw) ? 403
              : /\b503\b|UNAVAILABLE|overloaded|high demand/i.test(raw) ? 503
              : 500);

        process.stdout.write(`[ai/summary] Gemini error ${status}: ${raw}\n`);

        if (status === 401 || status === 403) {
            return res.status(401).json({
                error: 'Invalid GEMINI_API_KEY. Check backend/.env.',
            });
        }
        if (status === 429) {
            // Distinguish per-day vs per-minute limit from the real Gemini error.
            const isDaily = /per day|RPD|requests_per_day/i.test(raw);
            const isMinute = /per minute|RPM|requests_per_minute/i.test(raw);
            let msg;
            if (isDaily) {
                msg = 'Daily Gemini quota exhausted on the free tier. It resets at midnight Pacific time. Try again tomorrow, or use a different API key.';
            } else if (isMinute) {
                msg = 'Per-minute Gemini limit hit. Wait ~60 seconds and try again.';
            } else {
                msg = 'Gemini quota hit. If you have been testing a lot today, the daily free-tier cap is the likely cause — try again tomorrow.';
            }
            return res.status(429).json({ error: msg });
        }
        if (status === 503) {
            return res.status(503).json({
                error: 'Gemini servers are temporarily overloaded (Google-side, not your project). Please try again in 15-30 seconds.',
            });
        }
        return res.status(500).json({ error: raw });
    }
});

// ==============================================================
// ──────────────── AI DASHBOARD CHAT (Gemini Flash) ────────────
// ==============================================================
//  Role-aware chatbot that lives inside each user dashboard.
//  POST /api/ai/chat
//  Body: { userId, role, message, history?: [{ role: 'user'|'model', text }] }
//  Returns: { reply, model, usage }
//
//  Behaviour:
//   • Looks up the signed-in user and pulls a focused snapshot of
//     their data based on role.
//   • Feeds the snapshot + role-specific system prompt into Gemini
//     so answers reflect the user's actual offers / deliveries /
//     stats, not generic boilerplate.

// FeedHope offer/delivery lifecycle. The chatbot MUST use these exact
// definitions when answering any "what does X status mean" question or
// "how do I know if Y happened" question. Keep this list authoritative —
// the database stores these literal strings.
const STATUS_GLOSSARY = `
OFFER STATUS GLOSSARY (canonical lifecycle — memorize this):
- "available"          → A donor just posted the offer. No receiver has accepted it yet. It is visible on the public/receiver browse page.
- "accepted"           → A RECEIVER has accepted the offer. (This is the status that signals "the receiver took it.") The donor sees this status as confirmation of acceptance.
- "delivery_accepted"  → A VOLUNTEER (not the receiver) has accepted the delivery assignment from an admin. The receiver had already accepted in the previous step.
- "in_delivery"        → The volunteer is actively transporting the food to the receiver.
- "delivered"          → The food has reached the receiver. The transaction is complete.
- "expired"            → The expiration date passed before anyone took the offer.
- "cancelled"          → The donor or admin cancelled the offer.

KEY ANSWERS:
- "How do I know a receiver accepted my offer?" → Status changes from "available" to **"accepted"**. The donor also gets a notification.
- "How do I know a volunteer is on the way?" → Status changes to "delivery_accepted" then "in_delivery".
- "How do I know it was delivered?" → Status becomes "delivered".
NEVER conflate "accepted" (receiver) with "delivery_accepted" (volunteer) — they are different stages.
`;

// Shared rules every role inherits — focuses Gemini on EXACT numbers
// from the snapshot, prevents hallucinations, and provides counting
// shortcuts so it doesn't drift on common "how many X" questions.
const SHARED_DATA_RULES = `
DATA RULES — read carefully:
1. The "as_of" field tells you the current date and time. Use it for relative answers like "today", "this week", "yesterday".
2. The "summary" object holds PRE-COMPUTED counts and totals. Prefer reading from "summary" over re-counting arrays.
3. For "how many X" questions, return the exact number from "summary" (or count entries in the matching array). Never estimate.
4. For specific items (e.g. "what was my last offer"), pull the full record from the relevant array and quote names/dates verbatim.
5. Format dates human-friendly (e.g. "Mar 5, 2026" or "yesterday at 3pm") — don't dump raw ISO strings.
6. If the user asks something where the relevant array is empty (e.g. "no notifications yet"), say so plainly with a zero count.
7. NEVER fabricate names, IDs, numbers, or features. If a value really isn't in the snapshot, say "I don't see that in your data right now — try checking the [page name] page in your sidebar."
8. Use **bold** for key numbers/names. Use dash-bullet lists for multiple items. Keep replies under 4 short sentences unless listing.

SCOPE — HARD LIMITS (read this twice):
9. You answer ONLY about THIS user's FeedHope account and how to use the FeedHope app. You are NOT a general assistant. You do NOT have internet access. You do NOT have general knowledge about food safety, nutrition, current events, recipes, math, code, weather, or anything outside FeedHope.
10. If the user asks anything outside this scope (small talk, world knowledge, advice unrelated to FeedHope, "tell me a joke", "what's the weather", "who is X", "give me a recipe", "translate this", etc.), POLITELY REFUSE in one short sentence: "I'm HopeBot — I can only help with your FeedHope dashboard. Ask me about your offers, deliveries, notifications, or how to use any page."
11. If the user asks about FeedHope but the answer requires data NOT in your snapshot (e.g. someone else's private data, system internals, future predictions), say: "I don't have that information. The [page name] page may show what you're looking for." Do NOT guess.
12. Your knowledge of FeedHope itself is limited to: (a) the live data snapshot you receive each turn, (b) the STATUS GLOSSARY, (c) the role's FEATURES guide. If something isn't covered by those three sources, you do NOT know it — say so honestly instead of inventing.
13. Treat the snapshot as the single source of truth for facts about this user. Treat the FEATURES guide as the single source of truth for "how do I…" answers. If they conflict, prefer the snapshot for data and FEATURES for actions.

${STATUS_GLOSSARY}`;

// Per-role feature/action guide. The chatbot MUST cite these when users
// ask "how do I X". These reflect what the UI actually does — keep this
// in sync with the dashboard pages.
const DONOR_FEATURES = `
DONOR FEATURES & ACTIONS (the user CAN do these inside the app):
- Create a new offer → "New Offer" page (sidebar). Tip: upload a photo and the AI auto-fills food name, description, category, kg, portions, and dietary tags for review.
- View all offers → "My Offers" page. Each row has: View Details (eye icon), and a 3-dot menu with **"Edit Offer"** and **"Cancel Offer"**.
- Edit an offer → On "My Offers", click the 3-dot menu on the row, then "Edit Offer". You can change food name, category, description, dietary info, kg, portions, expiration, pickup time. Editing is allowed ONLY while status is "available". Once a receiver has accepted it (status "accepted") or later, the offer is locked and the Edit button is disabled.
- Cancel an offer → Same 3-dot menu, "Cancel Offer". Same locking rule: only while status is "available".
- See delivery history → "History" page lists offers that reached "delivered/completed".
- Read feedback from receivers → "Feedback" page.
- Send money support → "Money Donations" page.
- Request money / view fund distributions → "Money Requests" / "Fund Distributions".
- Manage account → "Profile".

When users ask "can I edit my offer?" or "how do I edit?" → walk them to **My Offers → 3-dot menu → Edit Offer**, and remind them it's only editable while status is "available".`;

const RECEIVER_FEATURES = `
RECEIVER FEATURES & ACTIONS:
- Browse all currently-available food → "Browse Offers" page.
- View an offer's details → click the offer card or the eye icon.
- Accept an offer → click the **Accept** button on the offer card / details modal. The offer's status moves from "available" to "accepted" and appears in "Accepted Offers".
- Cancel an acceptance → on "Accepted Offers", use the cancel option (only while status is still "accepted" — once a volunteer is assigned, it's locked).
- See past received food → "History" page.
- Read notifications → "Notifications" page.
- Leave feedback → "Feedback" page after delivery.
- Manage account → "Profile".`;

const VOLUNTEER_FEATURES = `
VOLUNTEER FEATURES & ACTIONS:
- See pickup requests an admin sent → "Volunteer Requests" / dashboard. Each request has **Accept** and **Reject** buttons.
- Track active deliveries → "My Deliveries". You can mark a delivery as picked up (in_delivery) and as delivered.
- Browse available offers → "Available Offers".
- See completed deliveries → "History".
- Read feedback received → "Feedback".
- Manage account → "Profile".`;

const ADMIN_FEATURES = `
ADMIN FEATURES & ACTIONS:
- See platform stats / urgent expiration alerts → "Dashboard". The red banner shows offers about to expire.
- Manage offers → "Food Offers" page. Each row's 3-dot menu has: View Details, **Assign Volunteer**, **Mark Expired**, **Cancel Offer**. Status filter and category filter at the top.
- Manage users → "Users" page. Disable/edit roles.
- Track deliveries → "Deliveries" page.
- Review money donations → "Money Donations".
- Approve/Reject donor money requests + send fund distributions → "Fund Distribution" page.
- Send notifications / read alerts → "Notifications".
- Manage account → "Profile".`;

const ROLE_PROMPTS = {
    Donor: `You are HopeBot, the in-app AI assistant for the FeedHope Donor dashboard.
The signed-in user is a DONOR who shares surplus food with the community in Lebanon.

The JSON snapshot covers every page they can visit:
- Dashboard / My Offers / History / Notifications / Feedback / Profile
- Money Donations / Money Requests / Fund Distributions

Answer questions about THEIR offers, history, ratings, money flows, and how to use any donor page.
${SHARED_DATA_RULES}
${DONOR_FEATURES}
TONE: warm, encouraging, concise. When the user asks "how do I…", point to the exact page + button name from DONOR FEATURES — never say a feature doesn't exist if it's listed above.`,

    Receiver: `You are HopeBot, the in-app AI assistant for the FeedHope Receiver dashboard.
The signed-in user is a RECEIVER (NGO, shelter, or family) who browses and accepts food offers.

The JSON snapshot covers every page they can visit:
- Dashboard / Browse Offers / Accepted Offers / History / Notifications / Feedback / Profile

Answer questions about their accepted offers, received history, what's currently available to browse, and how to use any receiver page.
${SHARED_DATA_RULES}
${RECEIVER_FEATURES}
TONE: warm, helpful, concise. When the user asks "how do I…", point to the exact page + button name from RECEIVER FEATURES.`,

    Volunteer: `You are HopeBot, the in-app AI assistant for the FeedHope Volunteer dashboard.
The signed-in user is a VOLUNTEER who picks up and delivers food.

The JSON snapshot covers every page they can visit:
- Dashboard / Available Offers / My Deliveries / Volunteer Requests / History / Notifications / Feedback / Profile

Answer questions about pending pickup requests, active deliveries, completed history, ratings received, and how to use any volunteer page.
${SHARED_DATA_RULES}
${VOLUNTEER_FEATURES}
TONE: friendly, action-oriented, concise. When the user asks "how do I…", point to the exact page + button name from VOLUNTEER FEATURES.`,

    Admin: `You are HopeBot, the in-app AI analyst-assistant for the FeedHope Admin dashboard.
The signed-in user is a PLATFORM ADMIN.

The JSON snapshot covers every admin page:
- Dashboard / Food Offers / Users / Deliveries / Money Donations / Fund Distribution / Notifications / Profile / Expiration Alerts

Answer questions with EXACT numbers from the snapshot — admins rely on precision.
${SHARED_DATA_RULES}
${ADMIN_FEATURES}
TONE: precise, neutral, professional. When the user asks "how do I…", point to the exact page + button name from ADMIN FEATURES.`,
};

// Pull a focused, lightweight snapshot for the given user/role.
async function buildChatContext(userId, role) {
    if (!userId) return { error: 'Missing userId' };

    // Common: the user's own basic profile + last 5 notifications.
    const [[user]] = await pool.query(
        `SELECT user_id, name, email, phone_number, status, created_at
         FROM User WHERE user_id = ?`,
        [userId]
    );
    if (!user) return { error: 'User not found' };

    const [notifications] = await pool.query(
        `SELECT message_title, message, type, date, read_at
         FROM Notifications WHERE user_id = ? ORDER BY date DESC LIMIT 10`,
        [userId]
    );

    // Food categories — lets the chatbot answer "what categories exist?"
    // without inventing names.
    const allCategories = await (async () => {
        try {
            const [rows] = await pool.query(
                `SELECT category_name FROM Food_category ORDER BY category_name`
            );
            return rows.map(r => r.category_name);
        } catch { return []; }
    })();

    // Time anchors — Gemini uses these to answer "today", "this week".
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const fmtLocal = d =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const ctx = {
        as_of: {
            iso: now.toISOString(),
            readable: now.toLocaleString('en-GB', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true,
            }),
            today_start: fmtLocal(todayStart),
            week_start:  fmtLocal(weekStart),
            month_start: fmtLocal(monthStart),
        },
        user: {
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            phone: user.phone_number,
            account_status: user.status,
            joined_at: user.created_at,
            role,
        },
        recent_notifications: notifications,
        unread_notifications_count: notifications.filter(n => !n.read_at).length,
        food_categories: allCategories,
    };

    // Helper to safely run a query and return [] on schema mismatch.
    const safe = async (sql, params = []) => {
        try { const [rows] = await pool.query(sql, params); return rows; }
        catch { return []; }
    };

    // ── Role-specific add-ons ─────────────────────────────────
    if (role === 'Donor') {
        const [[donor]] = await pool.query(
            `SELECT d.donor_id, d.organization_name, d.business_type, d.foundation_date,
                    a.street, a.city, a.country
             FROM Donor d
             LEFT JOIN Address a ON a.user_id = d.user_id
             WHERE d.user_id = ?`, [userId]
        );
        if (donor) {
            ctx.user.organization_name = donor.organization_name;
            ctx.user.business_type     = donor.business_type;
            ctx.user.foundation_date   = donor.foundation_date;
            ctx.user.address           = { street: donor.street, city: donor.city, country: donor.country };
            const [[stats]] = await pool.query(`
                SELECT
                    SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) AS active,
                    SUM(CASE WHEN status IN ('accepted','delivery_accepted','in_delivery') THEN 1 ELSE 0 END) AS in_progress,
                    SUM(CASE WHEN status IN ('delivered','completed') THEN 1 ELSE 0 END) AS delivered,
                    SUM(CASE WHEN status='expired' THEN 1 ELSE 0 END) AS expired,
                    SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled,
                    COALESCE(SUM(CASE WHEN status IN ('delivered','completed') THEN quantity_by_kg ELSE 0 END), 0) AS total_kg_donated,
                    COALESCE(SUM(CASE WHEN status IN ('delivered','completed') THEN number_of_person ELSE 0 END), 0) AS people_fed
                FROM Food_offer WHERE donor_id = ?`, [donor.donor_id]);

            // My Offers page — every offer with status
            const myOffers = await safe(`
                SELECT offer_id, food_name, status, number_of_person AS portions,
                       quantity_by_kg AS kg, expiration_date_and_time, created_at
                FROM Food_offer WHERE donor_id = ?
                ORDER BY offer_id DESC LIMIT 25`, [donor.donor_id]);

            // History page — delivered/completed offers + recipient
            const history = await safe(`
                SELECT fo.offer_id, fo.food_name, fo.number_of_person AS portions,
                       fo.quantity_by_kg AS kg, fo.status, fo.created_at,
                       ru.name AS receiver_name
                FROM Food_offer fo
                LEFT JOIN Receiver r ON r.receiver_id = fo.receiver_id
                LEFT JOIN User ru ON ru.user_id = r.user_id
                WHERE fo.donor_id = ? AND fo.status IN ('delivered','completed')
                ORDER BY fo.offer_id DESC LIMIT 15`, [donor.donor_id]);

            // Feedback page — reviews left for this donor
            const feedback = await safe(`
                SELECT f.feedback_id, f.rating, f.comment, f.feedback_date,
                       ru.name AS reviewer_name, fo.food_name
                FROM Feedback f
                LEFT JOIN User ru ON ru.user_id = f.reviewer_id
                LEFT JOIN Food_offer fo ON fo.offer_id = f.offer_id
                WHERE f.reviewee_id = ?
                ORDER BY f.feedback_date DESC LIMIT 10`, [userId]);

            // Money donations made by this donor
            const moneyDonations = await safe(`
                SELECT amount, payment_method, donation_date, reference_number
                FROM Money_donation WHERE donor_id = ?
                ORDER BY donation_date DESC LIMIT 10`, [donor.donor_id]);

            // Money requests this donor sent
            const moneyRequests = await safe(`
                SELECT request_id, amount, reason, status, request_date, rejection_reason
                FROM money_request WHERE donor_id = ?
                ORDER BY request_date DESC LIMIT 10`, [donor.donor_id]);

            // Fund distributions received by this donor
            const fundDistributions = await safe(`
                SELECT distribution_id, amount, payment_method, status, distribution_date, reference_number
                FROM Fund_Distribution WHERE donor_id = ?
                ORDER BY distribution_date DESC LIMIT 10`, [donor.donor_id]);

            // Pre-computed counts so Gemini doesn't have to count arrays.
            const avgRating = feedback.length
                ? Number((feedback.reduce((s, f) => s + Number(f.rating || 0), 0) / feedback.length).toFixed(2))
                : null;
            const totalDonatedMoney = moneyDonations.reduce((s, m) => s + Number(m.amount || 0), 0);
            const pendingRequests = moneyRequests.filter(r => r.status === 'pending').length;

            ctx.summary = {
                offers: {
                    active:      Number(stats.active || 0),
                    in_progress: Number(stats.in_progress || 0),
                    delivered:   Number(stats.delivered || 0),
                    expired:     Number(stats.expired || 0),
                    cancelled:   Number(stats.cancelled || 0),
                    total: Number(stats.active || 0) + Number(stats.in_progress || 0)
                         + Number(stats.delivered || 0) + Number(stats.expired || 0)
                         + Number(stats.cancelled || 0),
                },
                total_kg_donated:  Number(stats.total_kg_donated || 0),
                people_fed:        Number(stats.people_fed || 0),
                feedback_count:    feedback.length,
                average_rating:    avgRating,
                money_donations: {
                    count: moneyDonations.length,
                    total_amount: Number(totalDonatedMoney.toFixed(2)),
                },
                money_requests: {
                    total:    moneyRequests.length,
                    pending:  pendingRequests,
                    approved: moneyRequests.filter(r => r.status === 'approved').length,
                    rejected: moneyRequests.filter(r => r.status === 'rejected').length,
                },
                fund_distributions_count: fundDistributions.length,
            };
            ctx.my_offers = myOffers;
            ctx.delivery_history = history;
            ctx.feedback_received = feedback;
            ctx.money_donations = moneyDonations;
            ctx.money_requests = moneyRequests;
            ctx.fund_distributions = fundDistributions;
        }
    } else if (role === 'Receiver') {
        const [[receiver]] = await pool.query(
            `SELECT r.receiver_id, r.organization_name, r.business_type, r.foundation_date,
                    a.street, a.city, a.country
             FROM Receiver r
             LEFT JOIN Address a ON a.user_id = r.user_id
             WHERE r.user_id = ?`, [userId]
        );
        if (receiver) {
            ctx.user.organization_name = receiver.organization_name;
            ctx.user.business_type     = receiver.business_type;
            ctx.user.foundation_date   = receiver.foundation_date;
            ctx.user.address           = { street: receiver.street, city: receiver.city, country: receiver.country };
            const [[stats]] = await pool.query(`
                SELECT
                    SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END) AS accepted,
                    SUM(CASE WHEN status IN ('delivery_accepted','in_delivery') THEN 1 ELSE 0 END) AS in_delivery,
                    SUM(CASE WHEN status IN ('delivered','completed') THEN 1 ELSE 0 END) AS received,
                    COALESCE(SUM(CASE WHEN status IN ('delivered','completed') THEN number_of_person ELSE 0 END), 0) AS meals_received
                FROM Food_offer WHERE receiver_id = ?`, [receiver.receiver_id]);

            // Accepted / In-progress offers
            const acceptedOffers = await safe(`
                SELECT offer_id, food_name, status, number_of_person AS portions,
                       quantity_by_kg AS kg, expiration_date_and_time
                FROM Food_offer WHERE receiver_id = ?
                  AND status IN ('accepted','delivery_accepted','in_delivery')
                ORDER BY offer_id DESC LIMIT 15`, [receiver.receiver_id]);

            // History — already received
            const history = await safe(`
                SELECT fo.offer_id, fo.food_name, fo.number_of_person AS portions,
                       fo.status, du.name AS donor_name
                FROM Food_offer fo
                LEFT JOIN Donor d ON d.donor_id = fo.donor_id
                LEFT JOIN User du ON du.user_id = d.user_id
                WHERE fo.receiver_id = ? AND fo.status IN ('delivered','completed')
                ORDER BY fo.offer_id DESC LIMIT 15`, [receiver.receiver_id]);

            // Available offers right now (Browse page)
            const availableOffers = await safe(`
                SELECT fo.offer_id, fo.food_name, fo.number_of_person AS portions,
                       fo.quantity_by_kg AS kg, fo.expiration_date_and_time,
                       du.name AS donor_name, fc.category_name AS category
                FROM Food_offer fo
                JOIN Donor d ON d.donor_id = fo.donor_id
                JOIN User du ON du.user_id = d.user_id
                LEFT JOIN Food_category fc ON fc.category_id = fo.category_id
                WHERE fo.status = 'available'
                  AND (fo.expiration_date_and_time IS NULL OR fo.expiration_date_and_time > NOW())
                ORDER BY fo.offer_id DESC LIMIT 10`);

            // Feedback this receiver has given
            const feedbackGiven = await safe(`
                SELECT f.rating, f.comment, f.feedback_date, fo.food_name
                FROM Feedback f
                LEFT JOIN Food_offer fo ON fo.offer_id = f.offer_id
                WHERE f.reviewer_id = ?
                ORDER BY f.feedback_date DESC LIMIT 10`, [userId]);

            const avgRatingGiven = feedbackGiven.length
                ? Number((feedbackGiven.reduce((s, f) => s + Number(f.rating || 0), 0) / feedbackGiven.length).toFixed(2))
                : null;

            ctx.summary = {
                offers: {
                    accepted:    Number(stats.accepted || 0),
                    in_delivery: Number(stats.in_delivery || 0),
                    received:    Number(stats.received || 0),
                    total: Number(stats.accepted || 0) + Number(stats.in_delivery || 0) + Number(stats.received || 0),
                },
                meals_received:        Number(stats.meals_received || 0),
                accepted_offers_count: acceptedOffers.length,
                history_count:         history.length,
                available_offers_now:  availableOffers.length,
                feedback_given_count:  feedbackGiven.length,
                average_rating_given:  avgRatingGiven,
            };
            ctx.accepted_offers = acceptedOffers;
            ctx.history = history;
            ctx.available_offers = availableOffers;
            ctx.feedback_given = feedbackGiven;
        }
    } else if (role === 'Volunteer') {
        const [[vol]] = await pool.query(
            `SELECT v.volunteer_id, v.vehicle_type, v.plate_number, v.birthdate, v.gender,
                    a.street, a.city, a.country
             FROM Volunteer v
             LEFT JOIN Address a ON a.user_id = v.user_id
             WHERE v.user_id = ?`, [userId]
        );
        if (vol) {
            ctx.user.vehicle_type = vol.vehicle_type;
            ctx.user.plate_number = vol.plate_number;
            ctx.user.birthdate    = vol.birthdate;
            ctx.user.gender       = vol.gender;
            ctx.user.address      = { street: vol.street, city: vol.city, country: vol.country };
            const [[stats]] = await pool.query(`
                SELECT
                    SUM(CASE WHEN delivery_status='delivery_accepted' THEN 1 ELSE 0 END) AS accepted_pending,
                    SUM(CASE WHEN delivery_status='in_delivery' THEN 1 ELSE 0 END) AS in_delivery,
                    SUM(CASE WHEN delivery_status IN ('delivered','completed') THEN 1 ELSE 0 END) AS completed
                FROM Delivery WHERE volunteer_id = ?`, [vol.volunteer_id]);

            // Pickup requests admins sent to them
            const requests = await safe(`
                SELECT vr.request_id, vr.status, vr.created_at, vr.message,
                       fo.food_name, fo.expiration_date_and_time
                FROM volunteer_request vr
                JOIN Food_offer fo ON fo.offer_id = vr.offer_id
                WHERE vr.volunteer_id = ?
                ORDER BY vr.created_at DESC LIMIT 15`, [vol.volunteer_id]);

            // Active deliveries
            const myDeliveries = await safe(`
                SELECT d.delivery_id, d.delivery_status, d.delivery_time,
                       fo.food_name, fo.number_of_person AS portions,
                       du.name AS donor_name, ru.name AS receiver_name
                FROM Delivery d
                JOIN Food_offer fo ON fo.offer_id = d.offer_id
                LEFT JOIN Donor dn ON dn.donor_id = fo.donor_id
                LEFT JOIN User du ON du.user_id = dn.user_id
                LEFT JOIN Receiver r ON r.receiver_id = fo.receiver_id
                LEFT JOIN User ru ON ru.user_id = r.user_id
                WHERE d.volunteer_id = ?
                  AND d.delivery_status IN ('delivery_accepted','in_delivery')
                ORDER BY d.delivery_id DESC LIMIT 10`, [vol.volunteer_id]);

            // Completed delivery history
            const history = await safe(`
                SELECT d.delivery_id, d.delivery_time, fo.food_name,
                       du.name AS donor_name, ru.name AS receiver_name
                FROM Delivery d
                JOIN Food_offer fo ON fo.offer_id = d.offer_id
                LEFT JOIN Donor dn ON dn.donor_id = fo.donor_id
                LEFT JOIN User du ON du.user_id = dn.user_id
                LEFT JOIN Receiver r ON r.receiver_id = fo.receiver_id
                LEFT JOIN User ru ON ru.user_id = r.user_id
                WHERE d.volunteer_id = ?
                  AND d.delivery_status IN ('delivered','completed')
                ORDER BY d.delivery_id DESC LIMIT 15`, [vol.volunteer_id]);

            // Available offers volunteer could pick up
            const availableOffers = await safe(`
                SELECT fo.offer_id, fo.food_name, fo.expiration_date_and_time,
                       du.name AS donor_name
                FROM Food_offer fo
                JOIN Donor d ON d.donor_id = fo.donor_id
                JOIN User du ON du.user_id = d.user_id
                WHERE fo.status = 'accepted'
                ORDER BY fo.offer_id DESC LIMIT 10`);

            // Feedback received on deliveries
            const feedback = await safe(`
                SELECT f.rating, f.comment, f.feedback_date, fo.food_name,
                       ru.name AS reviewer_name
                FROM Feedback f
                LEFT JOIN User ru ON ru.user_id = f.reviewer_id
                LEFT JOIN Food_offer fo ON fo.offer_id = f.offer_id
                WHERE f.reviewee_id = ?
                ORDER BY f.feedback_date DESC LIMIT 10`, [userId]);

            const avgRating = feedback.length
                ? Number((feedback.reduce((s, f) => s + Number(f.rating || 0), 0) / feedback.length).toFixed(2))
                : null;
            const pendingRequests   = requests.filter(r => r.status === 'pending').length;
            const acceptedRequests  = requests.filter(r => r.status === 'accepted').length;
            const rejectedRequests  = requests.filter(r => r.status === 'rejected').length;

            ctx.summary = {
                deliveries: {
                    accepted_pending: Number(stats.accepted_pending || 0),
                    in_delivery:      Number(stats.in_delivery || 0),
                    completed:        Number(stats.completed || 0),
                    total: Number(stats.accepted_pending || 0) + Number(stats.in_delivery || 0) + Number(stats.completed || 0),
                },
                requests: {
                    total:    requests.length,
                    pending:  pendingRequests,
                    accepted: acceptedRequests,
                    rejected: rejectedRequests,
                },
                available_offers_now: availableOffers.length,
                feedback_count:       feedback.length,
                average_rating:       avgRating,
            };
            ctx.volunteer_requests = requests;
            ctx.my_deliveries = myDeliveries;
            ctx.delivery_history = history;
            ctx.available_offers = availableOffers;
            ctx.feedback_received = feedback;
        }
    } else if (role === 'Admin') {
        const [[offers]] = await pool.query(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) AS available,
                SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END) AS accepted,
                SUM(CASE WHEN status IN ('in_delivery','delivery_accepted') THEN 1 ELSE 0 END) AS in_delivery,
                SUM(CASE WHEN status IN ('delivered','completed') THEN 1 ELSE 0 END) AS delivered,
                SUM(CASE WHEN status='expired' THEN 1 ELSE 0 END) AS expired,
                SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled
            FROM Food_offer`);

        const [[userTotals]] = await pool.query(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN r.role_name='Donor' THEN 1 ELSE 0 END) AS donors,
                SUM(CASE WHEN r.role_name='Receiver' THEN 1 ELSE 0 END) AS receivers,
                SUM(CASE WHEN r.role_name='Volunteer' THEN 1 ELSE 0 END) AS volunteers,
                SUM(CASE WHEN r.role_name='Admin' THEN 1 ELSE 0 END) AS admins
            FROM User u
            LEFT JOIN Role r ON r.user_id = u.user_id`);

        const [[alerts]] = await pool.query(`SELECT COUNT(*) AS open FROM expiration_alert`);

        // Recent offers (Food Offers page)
        const recentOffers = await safe(`
            SELECT fo.offer_id, fo.food_name, fo.status,
                   fo.number_of_person AS portions, fo.expiration_date_and_time,
                   u.name AS donor_name, fc.category_name AS category
            FROM Food_offer fo
            JOIN Donor d ON d.donor_id = fo.donor_id
            JOIN User u ON u.user_id = d.user_id
            LEFT JOIN Food_category fc ON fc.category_id = fo.category_id
            ORDER BY fo.offer_id DESC LIMIT 10`);

        // Recent users (Users page)
        const recentUsers = await safe(`
            SELECT u.user_id, u.name, u.email, u.created_at, r.role_name AS role
            FROM User u
            LEFT JOIN Role r ON r.user_id = u.user_id
            ORDER BY u.user_id DESC LIMIT 10`);

        // Active expiration alerts (Dashboard banner)
        const expirationAlerts = await safe(`
            SELECT ea.alert_id, ea.message, ea.alert_time,
                   fo.food_name, fo.expiration_date_and_time
            FROM expiration_alert ea
            JOIN Food_offer fo ON fo.offer_id = ea.offer_id
            ORDER BY ea.alert_time DESC LIMIT 10`);

        // Money donations
        const moneyDonations = await safe(`
            SELECT md.amount, md.donation_date, md.payment_method, u.name AS donor_name
            FROM Money_donation md
            JOIN Donor d ON d.donor_id = md.donor_id
            JOIN User u ON u.user_id = d.user_id
            ORDER BY md.donation_date DESC LIMIT 10`);

        // Pending money requests (Fund Distribution page)
        const pendingRequests = await safe(`
            SELECT mr.request_id, mr.amount, mr.reason, mr.request_date, u.name AS donor_name
            FROM money_request mr
            JOIN Donor d ON d.donor_id = mr.donor_id
            JOIN User u ON u.user_id = d.user_id
            WHERE mr.status = 'pending'
            ORDER BY mr.request_date DESC LIMIT 10`);

        // Fund distributions
        const [[fundTotals]] = await pool.query(`
            SELECT
                COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END), 0) AS completed,
                COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END), 0) AS pending,
                COUNT(*) AS total_count
            FROM Fund_Distribution`);

        // Active deliveries
        const activeDeliveries = await safe(`
            SELECT d.delivery_id, d.delivery_status, fo.food_name,
                   uv.name AS volunteer_name
            FROM Delivery d
            JOIN Food_offer fo ON fo.offer_id = d.offer_id
            LEFT JOIN Volunteer v ON v.volunteer_id = d.volunteer_id
            LEFT JOIN User uv ON uv.user_id = v.user_id
            WHERE d.delivery_status IN ('delivery_accepted','in_delivery')
            ORDER BY d.delivery_id DESC LIMIT 10`);

        const totalDonationsAmount = moneyDonations.reduce((s, m) => s + Number(m.amount || 0), 0);
        const pendingRequestsAmount = pendingRequests.reduce((s, r) => s + Number(r.amount || 0), 0);

        ctx.summary = {
            offers: {
                total:       Number(offers.total || 0),
                available:   Number(offers.available || 0),
                accepted:    Number(offers.accepted || 0),
                in_delivery: Number(offers.in_delivery || 0),
                delivered:   Number(offers.delivered || 0),
                expired:     Number(offers.expired || 0),
                cancelled:   Number(offers.cancelled || 0),
            },
            users: {
                total:      Number(userTotals.total || 0),
                donors:     Number(userTotals.donors || 0),
                receivers:  Number(userTotals.receivers || 0),
                volunteers: Number(userTotals.volunteers || 0),
                admins:     Number(userTotals.admins || 0),
            },
            open_expiration_alerts: Number(alerts.open || 0),
            fund_distribution: {
                completed_amount: Number(fundTotals.completed || 0),
                pending_amount:   Number(fundTotals.pending || 0),
                total_count:      Number(fundTotals.total_count || 0),
            },
            money_donations: {
                count:        moneyDonations.length,
                total_amount: Number(totalDonationsAmount.toFixed(2)),
            },
            pending_money_requests: {
                count:        pendingRequests.length,
                total_amount: Number(pendingRequestsAmount.toFixed(2)),
            },
            active_deliveries_count: activeDeliveries.length,
        };
        ctx.recent_offers = recentOffers;
        ctx.recent_users = recentUsers;
        ctx.expiration_alerts = expirationAlerts;
        ctx.money_donations = moneyDonations;
        ctx.pending_money_requests = pendingRequests;
        ctx.active_deliveries = activeDeliveries;
    }

    return ctx;
}

app.post('/api/ai/chat', async (req, res) => {
    if (!hasGeminiKey) {
        return res.status(503).json({
            error: 'AI chat is not configured. Set GEMINI_API_KEY in backend/.env and restart the server.'
        });
    }

    const { userId, role, message, history } = req.body || {};
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Missing message.' });
    }
    const validRole = ['Donor', 'Receiver', 'Volunteer', 'Admin'].includes(role) ? role : 'Donor';

    try {
        const ctx = await buildChatContext(userId, validRole);
        const systemPrompt = ROLE_PROMPTS[validRole];

        // Map prior turns into Gemini's content format. Trim to last 8 turns
        // to keep prompt size sane.
        const priorTurns = Array.isArray(history)
            ? history.slice(-8).map(h => ({
                role: h.role === 'model' ? 'model' : 'user',
                parts: [{ text: String(h.text || '') }],
            }))
            : [];

        const userTurn = {
            role: 'user',
            parts: [{
                text:
                    `User question: ${message}\n\n` +
                    `Live data snapshot for this user (JSON):\n${JSON.stringify(ctx, null, 2)}`
            }],
        };

        const { result, label: modelUsed } = await callGeminiWithRetry({
            systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
            contents: [...priorTurns, userTurn],
            generationConfig: { temperature: 0.5, maxOutputTokens: 800 },
        });

        const reply = (result.response.text() || '').trim();
        const usage = result.response.usageMetadata || {};

        res.json({
            reply,
            model: modelUsed,
            usage: {
                input_tokens:  usage.promptTokenCount     || 0,
                output_tokens: usage.candidatesTokenCount || 0,
                total_tokens:  usage.totalTokenCount      || 0,
            },
        });
    } catch (err) {
        const raw = err?.message || String(err);
        const status =
            /\b429\b|quota|rate/i.test(raw) ? 429 :
            /\b401\b|API key not valid|invalid API key/i.test(raw) ? 401 :
            /\b503\b|UNAVAILABLE|overloaded/i.test(raw) ? 503 :
            500;

        process.stdout.write(`[ai/chat] Gemini error ${status}: ${raw}\n`);

        if (status === 401) {
            return res.status(401).json({ error: 'Invalid GEMINI_API_KEY. Check backend/.env.' });
        }
        if (status === 429) {
            return res.status(429).json({ error: 'AI is busy right now (rate limit). Please try again in a moment.' });
        }
        if (status === 503) {
            return res.status(503).json({ error: 'AI servers are temporarily overloaded. Please try again in 15-30 seconds.' });
        }
        return res.status(500).json({ error: 'AI chat failed. Please try again.' });
    }
});

// ==============================================================
// ──────────── AI IMAGE → AUTO-FILL OFFER FORM (Gemini) ────────
// ==============================================================
//  POST /api/donor/ai/analyze-image
//  Accepts: multipart/form-data with field "imageFile".
//  Returns: { foodName, description, categoryId, categoryName,
//            numPersons, quantityKg, dietary: [..] }
//
//  The donor uploads a photo of the food; Gemini's multimodal
//  vision returns suggested values which the form pre-fills.
//  The donor reviews and edits before submitting.

// Use memory storage so the buffer can be sent straight to Gemini
// without first writing to disk.
const aiImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024 }, // 4MB cap for vision input
});

const DIETARY_TAGS = [
    'Vegetarian', 'Vegan', 'Halal', 'Kosher',
    'Gluten-free', 'Dairy-free', 'Nut-free', 'Contains Allergens',
];

app.post('/api/donor/ai/analyze-image',
    aiImageUpload.single('imageFile'),
    async (req, res) => {
        if (!hasGeminiKey) {
            return res.status(503).json({
                error: 'AI is not configured. Set GEMINI_API_KEY in backend/.env.'
            });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded.' });
        }

        try {
            // Pull the live category list so we can ask Gemini to choose
            // exactly one and map it back to a category_id.
            const [categories] = await pool.query(
                `SELECT category_id, category_name FROM Food_category ORDER BY category_name`
            );
            const categoryNames = categories.map(c => c.category_name);

            const prompt = `You are analyzing a photo of food that a donor is about to share through FeedHope (a food-donation platform).

Look at the image and produce a JSON object with these EXACT keys:
{
  "foodName": "<short dish title, 3-6 words>",
  "description": "<one or two sentences describing what's visible: items, packaging, condition>",
  "categoryName": "<MUST be exactly one of: ${categoryNames.join(' | ')}>",
  "numPersons": <integer estimate of how many people this serves, 1-100>,
  "quantityKg": <number, estimated total weight in kilograms, e.g. 2.5>,
  "dietary": [<zero or more of: ${DIETARY_TAGS.join(', ')}>]
}

Strict rules:
- Return ONLY raw JSON. No markdown, no fences, no commentary.
- "categoryName" MUST be one of the listed names (exact spelling). Pick the closest match.
- Be conservative with "dietary" — only add a tag if it's clearly applicable.
- If the image does NOT show food, return: {"error": "Image does not appear to contain food. Please upload a food photo."}`;

            const imagePart = {
                inlineData: {
                    data: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype || 'image/jpeg',
                },
            };

            const { result, label: modelUsed } = await callGeminiWithRetry({
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }, imagePart],
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 600,
                    responseMimeType: 'application/json',
                },
            });

            const raw = (result.response.text() || '').trim();
            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch {
                // Strip any code fences Gemini might still emit
                const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
                try { parsed = JSON.parse(cleaned); }
                catch {
                    return res.status(502).json({
                        error: 'AI returned an unparseable response. Try a clearer photo.',
                    });
                }
            }

            if (parsed.error) {
                return res.status(422).json({ error: parsed.error });
            }

            // Map categoryName → categoryId (case-insensitive match)
            const matchedCat = categories.find(
                c => c.category_name.toLowerCase() === String(parsed.categoryName || '').toLowerCase()
            );

            // Whitelist the dietary tags Gemini returned
            const dietary = Array.isArray(parsed.dietary)
                ? parsed.dietary.filter(d => DIETARY_TAGS.includes(d))
                : [];

            const usage = result.response.usageMetadata || {};
            res.json({
                foodName:    String(parsed.foodName || '').slice(0, 120),
                description: String(parsed.description || '').slice(0, 500),
                categoryId:   matchedCat?.category_id || null,
                categoryName: matchedCat?.category_name || null,
                numPersons:  Number.isFinite(+parsed.numPersons) ? Math.round(+parsed.numPersons) : null,
                quantityKg:  Number.isFinite(+parsed.quantityKg) ? Number((+parsed.quantityKg).toFixed(2)) : null,
                dietary,
                model: modelUsed,
                usage: {
                    input_tokens:  usage.promptTokenCount     || 0,
                    output_tokens: usage.candidatesTokenCount || 0,
                    total_tokens:  usage.totalTokenCount      || 0,
                },
            });
        } catch (err) {
            const raw = err?.message || String(err);
            const status =
                /\b429\b|quota|rate/i.test(raw) ? 429 :
                /\b401\b|API key not valid|invalid API key/i.test(raw) ? 401 :
                /\b503\b|UNAVAILABLE|overloaded/i.test(raw) ? 503 :
                500;

            process.stdout.write(`[ai/analyze-image] Gemini error ${status}: ${raw}\n`);

            if (status === 401) return res.status(401).json({ error: 'Invalid GEMINI_API_KEY.' });
            if (status === 429) return res.status(429).json({ error: 'AI is busy (rate limit). Try again shortly.' });
            if (status === 503) return res.status(503).json({ error: 'AI is temporarily overloaded. Try again in 15-30s.' });
            return res.status(500).json({ error: 'Image analysis failed. Try again.' });
        }
    }
);

// ==============================================================
// ──────── AI TRANSLATE OFFERS → ARABIC (Gemini Flash) ─────────
// ==============================================================
//  POST /api/ai/translate-offers
//  Body: { offers: [{ offer_id, food_name, description, category_name, donor_name, address }] }
//  Returns: { translations: { <offer_id>: { food_name, description, category_name, donor_name, address } } }
//
//  Used by the Receiver "Browse Offers" page so non-English speakers
//  can read offer details in Arabic without leaving the page.
app.post('/api/ai/translate-offers', async (req, res) => {
    if (!hasGeminiKey) {
        return res.status(503).json({ error: 'AI translate is not configured.' });
    }
    const offers = Array.isArray(req.body?.offers) ? req.body.offers : [];
    if (!offers.length) return res.json({ translations: {} });

    // Trim payload — only send what needs translating + the id.
    const slim = offers.map(o => ({
        offer_id:            o.offer_id,
        food_name:           String(o.food_name || ''),
        description:         String(o.description || ''),
        category_name:       String(o.category_name || ''),
        donor_name:          String(o.donor_name || ''),
        address:             String(o.address || ''),
        dietary_information: String(o.dietary_information || ''),
    }));

    // Robust parser: strip fences, fix common Gemini quirks, then parse.
    const repairAndParse = (text) => {
        let s = (text || '').trim();
        s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        // Trim any prose around the JSON
        const firstBracket = Math.min(
            ...['[', '{'].map(c => { const i = s.indexOf(c); return i === -1 ? Infinity : i; })
        );
        const lastBracket = Math.max(s.lastIndexOf(']'), s.lastIndexOf('}'));
        if (Number.isFinite(firstBracket) && lastBracket > firstBracket) {
            s = s.slice(firstBracket, lastBracket + 1);
        }
        try { return JSON.parse(s); } catch {}
        // Strip trailing commas before ] or }
        try { return JSON.parse(s.replace(/,(\s*[\]}])/g, '$1')); } catch {}
        // Last resort: replace control characters that often slip into Arabic strings.
        const sanitized = s
            .replace(/,(\s*[\]}])/g, '$1')
            .replace(/[ -]+/g, ' ');
        return JSON.parse(sanitized);
    };

    // Translate a SINGLE offer in its own Gemini call. Used as a fallback
    // when batch translation fails — small payload, simpler JSON, much
    // less likely to break.
    const translateOne = async (offer) => {
        const prompt = `Translate these English fields to Modern Standard Arabic. Return JSON with the SAME keys. Preserve numbers/dates. Return an empty string for empty inputs.

${JSON.stringify({
    food_name:           offer.food_name,
    description:         offer.description,
    category_name:       offer.category_name,
    donor_name:          offer.donor_name,
    address:             offer.address,
    dietary_information: offer.dietary_information,
})}`;
        try {
            const { result } = await callGeminiWithRetry({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 800,
                    responseMimeType: 'application/json',
                },
            });
            const raw = (result.response.text() || '').trim();
            const obj = repairAndParse(raw);
            return {
                food_name:           obj?.food_name           || offer.food_name           || '',
                description:         obj?.description         || offer.description         || '',
                category_name:       obj?.category_name       || offer.category_name       || '',
                donor_name:          obj?.donor_name          || offer.donor_name          || '',
                address:             obj?.address             || offer.address             || '',
                dietary_information: obj?.dietary_information || offer.dietary_information || '',
            };
        } catch (e) {
            return {
                food_name:           offer.food_name           || '',
                description:         offer.description         || '',
                category_name:       offer.category_name       || '',
                donor_name:          offer.donor_name          || '',
                address:             offer.address             || '',
                dietary_information: offer.dietary_information || '',
            };
        }
    };

    const batchPrompt = `You are a translator. Translate FeedHope food-offer fields from English to Modern Standard Arabic (العربية الفصحى).

Rules:
- Preserve proper names (donor_name) unless a well-known Arabic equivalent exists.
- Keep numbers, units, and dates unchanged.
- Category mapping: Bakery → مخبوزات, Dairy → ألبان, Beverages → مشروبات, Prepared Meals → وجبات جاهزة, Grains → حبوب, Seafood → مأكولات بحرية, Canned → معلبات.
- Tone: natural, friendly.
- For empty input strings, return "".

Input:
${JSON.stringify(slim)}`;

    // Schema-enforced response: an array of objects with the exact keys we need.
    const responseSchema = {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                offer_id:            { type: 'string' },
                food_name:           { type: 'string' },
                description:         { type: 'string' },
                category_name:       { type: 'string' },
                donor_name:          { type: 'string' },
                address:             { type: 'string' },
                dietary_information: { type: 'string' },
            },
            required: ['offer_id', 'food_name', 'description', 'category_name', 'donor_name', 'address', 'dietary_information'],
        },
    };

    try {
        let translations = {};
        let modelUsed = null;

        // ── Try batch first ─────────────────────────────────
        let batchOk = false;
        try {
            const { result, label } = await callGeminiWithRetry({
                contents: [{ role: 'user', parts: [{ text: batchPrompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 4096,
                    responseMimeType: 'application/json',
                    responseSchema,
                },
            });
            modelUsed = label;
            const raw = (result.response.text() || '').trim();
            const parsed = repairAndParse(raw);
            const items = Array.isArray(parsed) ? parsed
                : Array.isArray(parsed?.data) ? parsed.data
                : Array.isArray(parsed?.translations) ? parsed.translations
                : null;
            if (items && items.length) {
                items.forEach(item => {
                    if (item && item.offer_id != null) {
                        translations[String(item.offer_id)] = {
                            food_name:           item.food_name           || '',
                            description:         item.description         || '',
                            category_name:       item.category_name       || '',
                            donor_name:          item.donor_name          || '',
                            address:             item.address             || '',
                            dietary_information: item.dietary_information || '',
                        };
                    }
                });
                batchOk = Object.keys(translations).length === slim.length;
            }
        } catch (batchErr) {
            process.stdout.write(`[ai/translate-offers] batch failed (${batchErr?.message || batchErr}); falling back to per-offer\n`);
        }

        // ── Per-offer fallback for any missing IDs ───────────
        const missing = slim.filter(o => !translations[String(o.offer_id)]);
        if (missing.length) {
            process.stdout.write(`[ai/translate-offers] translating ${missing.length} item(s) individually\n`);
            const oneResults = await Promise.all(missing.map(o => translateOne(o)));
            missing.forEach((o, i) => {
                translations[String(o.offer_id)] = oneResults[i];
            });
        }

        res.json({ translations, model: modelUsed || GEMINI_PRIMARY_MODEL });
    } catch (err) {
        const raw = err?.message || String(err);
        const status =
            /\b429\b|quota|rate/i.test(raw) ? 429 :
            /\b401\b|API key not valid/i.test(raw) ? 401 :
            /\b503\b|UNAVAILABLE|overloaded/i.test(raw) ? 503 :
            500;
        process.stdout.write(`[ai/translate-offers] error ${status}: ${raw}\n`);
        if (status === 429) return res.status(429).json({ error: 'AI is busy (rate limit). Try again shortly.' });
        if (status === 503) return res.status(503).json({ error: 'AI is temporarily overloaded. Try again in 15-30s.' });
        if (status === 401) return res.status(401).json({ error: 'Invalid GEMINI_API_KEY.' });
        return res.status(500).json({ error: 'Translation failed. Try again.' });
    }
});

app.listen(5000, () => process.stdout.write("O&H - FeedHope\n"));



