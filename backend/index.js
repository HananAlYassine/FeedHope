// ========================================
//  FeedHope — Omar & Hanan — index.js
// ========================================

import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bcrypt from "bcryptjs";  // for password hashing

// All of them are for the Profile Picture (Add/delete/change)
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

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


// Helper: validate password length rules (3–10 characters)
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

        // Insert the address linked to this user
        const [a] = await conn.query(
            "INSERT INTO Address (street, city, country, latitude, longitude, user_id) VALUES (?,?,?,?,?,?)",
            [street, city, country, latitude, longitude, uid]
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

        // Insert the address for this receiver
        const [a] = await conn.query(
            "INSERT INTO Address (street, city, country, latitude, longitude, user_id) VALUES (?,?,?,?,?,?)",
            [street, city, country, latitude, longitude, uid]
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
// ──────────────── Admin Section ────────────────────────
// ==============================================================

// ── Fixed Admin Credentials (hardcoded) ──
const ADMIN_EMAIL    = "admin@feedhope.com";   
const ADMIN_PASSWORD = "Admin@1234";           


// ==============================================================
// ──────────────── SIGN IN ─────────────────────────────────────
// ==============================================================
// ──── 5. Sign In (Fixed with logging) ────
app.post("/api/signin", async (req, res) => {
    const { email, password } = req.body;
    const conn = await pool.getConnection();


    // 1️⃣ Check admin FIRST — before touching the database
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        return res.json({
        user: {
            id: 0,
            name: "Admin",
            email: ADMIN_EMAIL,
            role: "Admin"
        }
        });
    }

    try {
        // Find the user by email
        const [users] = await conn.query("SELECT * FROM User WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const user = users[0];
        if (user.status === 'pending') {
            return res.status(403).json({ error: "Please verify your email before signing in." });
        }
        if (user.status !== "active") {
            return res.status(403).json({ error: "Account is not active." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const [roles] = await conn.query("SELECT role_name FROM Role WHERE user_id = ?", [user.user_id]);
        const role = roles.length > 0 ? roles[0].role_name : null;

        // Insert Syslog entry – check if it actually writes
        const [sysResult] = await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Login', `User logged in successfully as ${role || 'User'}`, user.user_id]
        );
        console.log(`[DEBUG] Sign-in Syslog inserted, affected rows: ${sysResult.affectedRows}`);

        res.status(200).json({
            message: "Sign in successful!",
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                phone_number: user.phone_number,
                role: role
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
// ──────────────── LOGOUT ─────────────────────────────────────
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

        res.status(201).json({ message: 'Your message has been sent successfully!' });
    } catch (err) {
        console.error('Contact Us DB Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});



// ────────────────────────────── RECEIVER ────────────────────────────────────


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
        // Incoming = Delivery rows linked to this receiver's accepted offers
        const [[{ incomingCount }]] = await pool.query(`
            SELECT COUNT(*) AS incomingCount
            FROM Delivery d
            JOIN Food_offer fo ON fo.offer_id = d.offer_id
            WHERE fo.receiver_id = ?
            AND d.delivery_status IN ('assigned', 'in_transit')
        `, [receiver.receiver_id]);

        // ── Step 5: Count total meals received (from Donation_history) ──
        const [[{ mealsReceived }]] = await pool.query(`
            SELECT COALESCE(SUM(quantity), 0) AS mealsReceived
            FROM Donation_history
            WHERE receiver_id = ?
        `, [receiver.receiver_id]);

        // ── Step 6: Get the latest available food offers (max 5 for the dashboard) ──
        const [offers] = await pool.query(`
            SELECT
                fo.offer_id,
                fo.food_name,
                fo.description,
                fo.number_of_person  AS portions,
                fo.pickup_time,
                fo.status,
                u.name               AS donor_name,
                a.street             AS donor_street,
                a.city               AS donor_city
            FROM Food_offer fo
            JOIN Donor d   ON d.donor_id  = fo.donor_id
            JOIN User u    ON u.user_id   = d.user_id
            JOIN Address a ON a.address_id = d.address_id
            WHERE fo.status = 'available'
            ORDER BY fo.offer_id DESC
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
                availableOffers:    Number(availableCount),   // Platform-wide available count
                myAccepted:         Number(acceptedCount),    // This receiver's accepted count
                incomingDeliveries: Number(incomingCount),    // Active deliveries incoming
                mealsReceived:      Number(mealsReceived)     // Total meals received historically
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
app.post("/api/receiver/accept-offer", async (req, res) => {
    const { offerId, userId } = req.body;  // ← rename receiverId → userId

    // Validate input
    if (!offerId || !userId) {
        return res.status(400).json({ error: "Offer ID and User ID are required." });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1 - Get the actual receiver_id from the Receiver table using the user_id
        const [[receiver]] = await conn.query(
            "SELECT receiver_id FROM Receiver WHERE user_id = ?",
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

        // 3 - Update the offer with the correct receiver_id
        await conn.query(
            "UPDATE Food_offer SET receiver_id = ?, status = 'accepted' WHERE offer_id = ?",
            [receiverId, offerId]
        );

        // 4 - Notify the receiver
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id)
            VALUES ('Offer Accepted', ?, 'offer_accepted', ?)`,
            [`You have successfully accepted the offer: "${offer.food_name}"`, userId]
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
// ──────────────── RECEIVER Profile API ──────────────────────
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
            WHERE receiver_id = ? AND status IN ('accepted', 'completed')
        `, [profile.receiver_id]);

         // ── Step 3: Deliveries Received ──
        // Count completed deliveries that correspond to this receiver's accepted offers.
        const [[{ deliveriesReceived }]] = await pool.query(`
            SELECT COUNT(*) AS deliveriesReceived
            FROM Delivery d
            JOIN Food_offer fo ON fo.offer_id = d.offer_id
            WHERE fo.receiver_id = ?
            AND d.delivery_status = 'completed'
        `, [profile.receiver_id]);

        
       // ── Step 4: People Served ──
        // Sum number_of_person across all completed offers for this receiver.
        // This represents the total meals/people that benefited from donations.
        const [[{ peopleServed }]] = await pool.query(`
            SELECT COALESCE(SUM(fo.number_of_person), 0) AS peopleServed
            FROM Food_offer fo
            WHERE fo.receiver_id = ?
            AND fo.status IN ('accepted', 'completed')
        `, [profile.receiver_id]);

        // ──── Return everything ────
        res.status(200).json({
            profile,
            stats: {
                totalReceived:      Number(totalReceived),
                peopleServed:       Number(peopleServed),
                deliveriesReceived: Number(deliveriesReceived)
            }
        });

    } catch (err) {
        console.error("Profile GET error:", err);
        res.status(500).json({ error: "Failed to load profile." });
    }
});

// ==============================================================
// ──── PUT /api/receiver/profile/:userIdb (Edit Profile) ───────
//
//  Updates: User.name, User.email, User.phone_number
//           Address.street  (first address linked to this user)
//           Receiver.business_type (the org type)
// ==============================================================
app.put("/api/receiver/profile/:userId", async (req, res) => {
    const { userId } = req.params;
    const { name, email, phone, street, org_type } = req.body;

    // Basic validation — all fields are required
    if (!name || !email || !phone || !street || !org_type) {
        return res.status(400).json({ error: "All profile fields are required." });
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
            "UPDATE Address SET street = ? WHERE user_id = ? LIMIT 1",
            [street, userId]
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
            ORDER BY fo.offer_id DESC
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
            `INSERT INTO Notifications (message_title, message, type, user_id)
            SELECT 'Offer Cancelled', CONCAT('The receiver has cancelled the offer: ', ?, '. It is now available again.'), 'cancellation', u.user_id
            FROM Food_offer fo
            JOIN Donor d ON d.donor_id = fo.donor_id
            JOIN User u ON u.user_id = d.user_id
            WHERE fo.offer_id = ?`,
            [offer.food_name, offerId]
        );

        // Notify the receiver
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id)
            VALUES ('Offer Cancelled', 'You have cancelled an offer. The donor has been notified, and the offer is now available for others.', 'cancellation', ?)`,
            [userId]
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
        const [[offer]] = await conn.query(
            `SELECT receiver_id, donor_id FROM Food_offer WHERE offer_id = ? AND status = 'accepted'`,
            [offerId]
        );
        if (!offer) {
            await conn.rollback();
            return res.status(404).json({ error: "Accepted offer not found." });
        }

        const [[delivery]] = await conn.query(
            `SELECT delivery_id, volunteer_id FROM Delivery 
             WHERE offer_id = ? AND delivery_status = 'completed' LIMIT 1`,
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
                del.delivery_time                AS delivered_date,  -- using delivery_time as completion timestamp
                EXISTS(
                    SELECT 1 FROM Feedback_and_rating fr
                    WHERE fr.delivery_id = del.delivery_id
                      AND fr.given_by = ?
                ) AS feedback_given
            FROM Delivery del
            JOIN Food_offer fo ON fo.offer_id = del.offer_id
            JOIN Donor d       ON d.donor_id  = fo.donor_id
            JOIN User u        ON u.user_id   = d.user_id
            WHERE fo.receiver_id = ?
              AND del.delivery_status = 'completed'
            ORDER BY del.delivery_time DESC
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

// ──── 17. Mark all notifications as read for a receiver ───────────────
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
            "SELECT COUNT(*) AS count FROM Notifications WHERE user_id = ? AND read_at IS NULL",
            [userId]
        );
        res.json({ count });
    } catch (err) {
        console.error("Unread count error:", err);
        res.status(500).json({ error: "Failed to get unread count." });
    }
});



// ────────────────────────────── Donor ────────────────────────────────────

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

        // 3. Recent Offers
        const [recent] = await pool.query(
            "SELECT offer_id, food_name, status, number_of_person, created_at FROM Food_offer WHERE donor_id = ? ORDER BY created_at DESC LIMIT 3",
            [donorId]
        );

        // 4. Notifications
        const [notifs] = await pool.query(
            `SELECT * FROM Notifications WHERE user_id = ? ORDER BY (read_at IS NULL) DESC, date DESC LIMIT 3`,
            [userId]
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
            unreadCount: notifs.length // Simplified for now
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// ==============================================================
// ──── GET /api/donor/profile/:userId ─────────────────────────
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
                a.country
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
// ──── PUT /api/donor/profile/:userId ─────────────────────────
//
//  Updates: User.name, User.email, User.phone_number
//           Address.street (first address linked to this donor)
//           Donor.business_type
//
//  Request body: { name, email, phone, street, business_type }
// ==============================================================
// ==============================================================
// ──── PUT /api/donor/profile/:userId ─────────────────────────
// ==============================================================
app.put("/api/donor/profile/:userId", async (req, res) => {
    const { userId } = req.params;
    const { name, email, phone, street, city, business_type } = req.body;

    if (!name || !email || !phone || !street || !city || !business_type) {
        return res.status(400).json({ error: "All fields except country are required." });
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
                "INSERT INTO Address (user_id, street, city, country) VALUES (?, ?, ?, ?)",
                [userId, street, city, DEFAULT_COUNTRY]
            );
        } else {
            await conn.query(
                "UPDATE Address SET street = ?, city = ? WHERE user_id = ?",
                [street, city, userId]
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

        // 🔔 Add Notification
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

        // 🔔 Add Notification
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
// ──── PUT /api/donor/change-password/:userId ─────────────────
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

        // 📜 Log to Syslog
        await pool.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Password Change', 'Donor changed their password', userId]
        );

        // 🔔 Add Notification
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



// GET offers for a specific donor with optional status filtering
// Get all offers for a specific donor with optional status filtering
app.get('/api/donor/my-offers/:donorId', async (req, res) => {
    const { donorId } = req.params;
    const { status } = req.query;

    try {
        let query = `
            SELECT 
        o.offer_id, 
        o.food_name, 
        c.category_name, 
        o.quantity_by_kg, 
        o.status,
        o.created_at -- This contains Date + Hour/Min/Sec
    FROM food_offer o
    LEFT JOIN food_category c ON o.category_id = c.category_id
    WHERE o.donor_id = ?
        `;

        const queryParams = [donorId];

        if (status && status !== 'All') {
            query += " AND o.status = ?";
            queryParams.push(status);
        }

        // Sorting by created_at DESC ensures the most recent offers show first
        query += " ORDER BY o.created_at DESC";

        const [rows] = await pool.query(query, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('SQL ERROR:', error.message);
        res.status(500).json({ error: error.message });
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

        if (details.length > 0) {
            const { food_name, user_id } = details[0];

            await conn.query("DELETE FROM Food_offer WHERE offer_id = ?", [offerId]);

            // Notify user of deletion
            await conn.query(
                `INSERT INTO Notifications (message_title, message, type, user_id, date) VALUES (?, ?, ?, ?, NOW())`,
                ['Offer Removed', `The offer "${food_name}" has been deleted.`, 'deletion', user_id]
            );
        }

        await conn.commit();
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        conn.release();
    }
});
// GET Donor Delivered History
app.get('/api/donor/history/:donorId', async (req, res) => {
    const { donorId } = req.params;

    try {
        const query = `
            SELECT 
                fo.offer_id AS id,
                fo.food_name AS title,
                COALESCE(u.name, 'Organization') AS receiver, 
                COALESCE(fo.quantity_by_kg, 0) AS quantity,
                COALESCE(fo.number_of_person, 0) AS people_helped, 
                COALESCE(MAX(fb.rating), 0) AS rating,
                fo.status
            FROM Food_offer fo
            LEFT JOIN Receiver r ON fo.receiver_id = r.receiver_id
            LEFT JOIN User u ON r.user_id = u.user_id
            LEFT JOIN Delivery d ON fo.offer_id = d.offer_id
            LEFT JOIN Feedback_and_rating fb ON d.delivery_id = fb.delivery_id
            WHERE fo.donor_id = ? AND fo.status = 'Delivered'
            GROUP BY fo.offer_id
            ORDER BY fo.offer_id DESC
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

        // 1️⃣ Get donor_id from Donor table using user_id
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

        // 2️⃣ Insert into Food_offer
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

        // 3️⃣ Handle optional image upload
        if (req.file) {
            const imageUrl = `/uploads/offers/${req.file.filename}`;
            await conn.query(
                `INSERT INTO Food_photo (image_url, offer_id, uploaded_at)
                 VALUES (?, ?, NOW())`,
                [imageUrl, newOfferId]
            );
        }

        // 4️⃣ Log the action in Syslog
        await conn.query(
            `INSERT INTO Syslog (action, description, user_id)
            VALUES (?, ?, ?)`,
            ['Create Offer', `Donor created new food offer: ${foodName}`, userId]
        );

        // 5️⃣ ADDED: Insert into Notifications table
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


// ==============================================================
// ──────────────── DONOR MONEY DONATION ────────────────────────
// ==============================================================

// ──── 11. Process Money Donation (FIXED) ────
app.post("/api/donor/donate-money", async (req, res) => {
    // 1. Accept userId instead of donor_id to match your frontend storage
    const { amount, payment_method, userId, description } = req.body;

    // Validate input
    if (!amount || !payment_method || !userId) {
        return res.status(400).json({
            error: "Missing required donation details.",
            received: { amount, payment_method, userId }
        });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 2. Look up the donor_id using the userId (Just like you do in create-offer)
        const [donorRows] = await conn.query(
            "SELECT donor_id FROM Donor WHERE user_id = ?",
            [userId]
        );

        if (donorRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: "Donor profile not found for this user." });
        }

        const donorId = donorRows[0].donor_id;

        // 3. Insert the donation record
        const [result] = await conn.query(
            `INSERT INTO Money_donation (donation_date, payment_method, amount, donor_id, description) 
             VALUES (NOW(), ?, ?, ?, ?)`,
            [payment_method, amount, donorId, description || null]
        );

        // 4. Log the action in Syslog
        await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Donation', `User made a monetary donation of $${amount} via ${payment_method}`, userId]
        );

        // 5. Add a Notification for the user (Optional but recommended for consistency)
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id, date)
             VALUES (?, ?, ?, ?, NOW())`,
            ['Donation Received', `Thank you for your $${amount} donation via ${payment_method}!`, 'success', userId]
        );

        await conn.commit();
        res.status(201).json({
            message: "Thank you! Your donation was successful.",
            donationId: result.insertId
        });
    } catch (err) {
        await conn.rollback();
        console.error("[ERROR] Donation API failure:", err.message);
        res.status(500).json({ error: "Failed to process donation. Database error." });
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
                md.amount, 
                md.payment_method AS method, 
                md.description AS note, 
                md.donation_date AS date
             FROM Money_donation md
             JOIN Donor d ON md.donor_id = d.donor_id
             WHERE d.user_id = ?
             ORDER BY md.donation_date DESC`,
            [userId]
        );

        res.status(200).json(rows);
    } catch (err) {
        console.error("Fetch donation history error:", err);
        res.status(500).json({ error: "Failed to load donation history." });
    }
});

// ==============================================================
// ──────────────── DONOR: NOTIFICATIONS ─────────────────
// ==============================================================
// 1. Fetch all notifications for the Donor page
app.get("/api/donor/notifications/all/:userId", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM Notifications WHERE user_id = ? ORDER BY date DESC",
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
            "SELECT COUNT(*) as count FROM Notifications WHERE user_id = ? AND read_at IS NULL",
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
app.get("/api/donor/feedback/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        // We select the feedback where the donor_id matches the logged-in user.
        // We join the User table to get the name of the receiver who submitted it.
        // Adjust "u.first_name" and "u.last_name" to match your actual User table columns (e.g., u.name or u.organization_name)
        const [feedbackList] = await pool.query(
            `SELECT 
                f.rating, 
                f.comment, 
                f.feedback_date,
                f.delivery_id,
                u.first_name, 
                u.last_name
             FROM Feedback_and_rating f
             LEFT JOIN User u ON f.given_by = u.user_id
             WHERE f.donor_id = ?
             ORDER BY f.feedback_date DESC`,
            [userId]
        );

        res.status(200).json(feedbackList);
    } catch (err) {
        console.error("Error fetching donor feedback:", err);
        res.status(500).json({ error: "Failed to retrieve feedback." });
    }
});









// ────────────────────── Admin ─────────────────────────


// ==============================================================
// ──────────────── Admin Food Offers Page  ─────────────────
// ==============================================================

// ──────────────────────────────────────────────────────────────
//  GET /api/admin/food-offers
//  Returns all food offers with donor name + category, plus distinct
//  statuses and categories for filter dropdowns.
// ──────────────────────────────────────────────────────────────
app.get('/api/admin/food-offers', async (req, res) => {
    try {
        // All offers with donor name, category name, and donor city
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
            ORDER BY fo.offer_id DESC
        `);

        // Distinct statuses (for dropdown)
        const [statusRows] = await pool.query(`
            SELECT DISTINCT status FROM Food_offer WHERE status IS NOT NULL ORDER BY status
        `);

        // Distinct categories (for dropdown) – from Food_category table
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


// ──────────────────────────────────────────────────────────────
//  GET /api/admin/volunteers
//  Returns all active volunteers (for the Assign dropdown).
// ──────────────────────────────────────────────────────────────
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


// ──────────────────────────────────────────────────────────────
//  PUT /api/admin/food-offers/assign-volunteer
//  Assigns a volunteer to an offer and sets status to 'in_delivery'.
//  Body: { offerId, volunteerId }
// ──────────────────────────────────────────────────────────────
app.put('/api/admin/food-offers/assign-volunteer', async (req, res) => {
    const { offerId, volunteerId } = req.body;
    if (!offerId || !volunteerId) {
        return res.status(400).json({ error: 'offerId and volunteerId are required.' });
    }
    try {
        // Update the offer status – you may also insert into a Delivery table here
        const [result] = await pool.query(`
            UPDATE Food_offer
            SET status = 'in_delivery'
            WHERE offer_id = ?
        `, [offerId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Offer not found.' });
        }

        // Optional: insert a Delivery record
        // await pool.query(`
        //     INSERT INTO Delivery (offer_id, volunteer_id, delivery_status, assigned_at)
        //     VALUES (?, ?, 'assigned', NOW())
        // `, [offerId, volunteerId]);

        res.json({ message: 'Volunteer assigned successfully.' });
    } catch (err) {
        console.error('PUT /api/admin/food-offers/assign-volunteer error:', err);
        res.status(500).json({ error: 'Failed to assign volunteer.' });
    }
});

// ──────────────────────────────────────────────────────────────
//  PUT /api/admin/food-offers/:offerId/expire
//  Marks an offer as expired.
// ──────────────────────────────────────────────────────────────
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


// ──────────────────────────────────────────────────────────────
//  PUT /api/admin/food-offers/:offerId/cancel
//  Cancels an offer.
// ──────────────────────────────────────────────────────────────
app.put('/api/admin/food-offers/:offerId/cancel', async (req, res) => {
    const { offerId } = req.params;
    try {
        const [result] = await pool.query(`
            UPDATE Food_offer
            SET status = 'cancelled'
            WHERE offer_id = ?
        `, [offerId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Offer not found.' });
        }
        res.json({ message: 'Offer cancelled.' });
    } catch (err) {
        console.error('PUT /api/admin/food-offers/:offerId/cancel error:', err);
        res.status(500).json({ error: 'Failed to cancel offer.' });
    }
});


// ──────────────────────────────────────────────────────────────
//  GET /api/admin/notifications/unread-count
//  Returns count of unread admin notifications.
// ──────────────────────────────────────────────────────────────
app.get('/api/admin/notifications/unread-count', async (req, res) => {
    try {
        const [[row]] = await pool.query(`
            SELECT COUNT(*) AS count
            FROM notifications
            WHERE recipient_role = 'Admin'
            AND read_at IS NULL
        `);
        res.json({ count: row.count });
    } catch (err) {
        // If the table doesn't exist yet, just return 0 gracefully
        res.json({ count: 0 });
    }
});


// ==============================================================
// ──────────────── Admin Money Donations Page  ─────────────────
// ==============================================================

// ──────────────────────────────────────────────────────────────
//  GET /api/admin/money-donations
//  Returns all money donations with donor name, amount, payment method, date.
// ──────────────────────────────────────────────────────────────
app.get('/api/admin/money-donations', async (req, res) => {
    try {
        const [rows] = await pool.query(`
        SELECT
            md.donation_id,
            md.amount,
            md.payment_method,
            md.description,  
            md.donation_date,
            u.name AS donor_name
        FROM Money_donation md
        JOIN Donor d ON md.donor_id = d.donor_id
        JOIN User u ON d.user_id = u.user_id
        ORDER BY md.donation_date DESC
        `);
        res.json(rows);
    } catch   (err) {
        console.error('GET /api/admin/money-donations error:', err);
        res.status(500).json({ error: 'Failed to fetch money donations.' });
    }
});










// ==============================================================
// ──────────────── START SERVER ────────────────────────────────
// ==============================================================
app.listen(5000, () => console.log("O&H - FeedHope"));