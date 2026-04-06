// ========================================
//  FeedHope — Omar & Hanan — index.js
// ========================================

import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bcrypt from "bcryptjs";

const app = express();

// Allow cross-origin requests (React frontend on port 3000 talks to this server on 5000)
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// ─────────────────────────────────────────────────────────────
//  MySQL Connection Pool
//  Using a pool (instead of a single connection) so multiple
//  simultaneous requests can each get their own DB connection.
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
// ──────────────── SIGN IN ─────────────────────────────────────
// ==============================================================

// ──── 5. Sign In ────
// Returns the user's basic info + role so the frontend can route them
// to the correct dashboard (Receiver → /receiver-dashboard, etc.)
app.post("/api/signin", async (req, res) => {
    const { email, password } = req.body;
    const conn = await pool.getConnection();

    try {
        // Find the user by email
        const [users] = await conn.query("SELECT * FROM User WHERE email = ?", [email]);

        if (users.length === 0) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const user = users[0];

        // Block sign-in if email has not been verified yet
        if (user.status === 'pending') {
            return res.status(403).json({ error: "Please verify your email before signing in." });
        }
        // Block sign-in if account has been deactivated
        if (user.status !== "active") {
            return res.status(403).json({ error: "Account is not active." });
        }

        // Compare the submitted plain-text password against the stored bcrypt hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        // Fetch the role(s) assigned to this user
        const [roles] = await conn.query("SELECT role_name FROM Role WHERE user_id = ?", [user.user_id]);
        const role = roles.length > 0 ? roles[0].role_name : null;

        // Write a login event to the syslog
        await conn.query(
            "INSERT INTO Syslog (action, description, user_id) VALUES (?, ?, ?)",
            ['Login', `User logged in successfully as ${role || 'User'}`, user.user_id]
        );

        // Return the user's basic info and role.
        // The frontend stores this in localStorage and uses the role to redirect:
        //   Receiver  → /receiver-dashboard
        //   Donor     → /donor-dashboard
        //   Volunteer → /volunteer-dashboard
        res.status(200).json({
            message: "Sign in successful!",
            user: {
                user_id:      user.user_id,
                name:         user.name,
                email:        user.email,
                phone_number: user.phone_number,
                role:         role
            }
        });
    } catch (err) {
        console.error("Sign in error:", err);
        res.status(500).json({ error: "Sign in failed." });
    } finally {
        conn.release();
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
        // Join User → Receiver → Receiver_location → Address to get all profile fields
        const [receiverRows] = await pool.query(`
            SELECT
                u.user_id,
                u.name,
                u.email,
                u.phone_number,
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
        // For now this is a platform-wide count; later you can filter by location/category
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
    const { offerId, receiverId } = req.body; // Both IDs come from the frontend

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Verify the offer exists and is still available
        const [[offer]] = await conn.query(
            "SELECT * FROM Food_offer WHERE offer_id = ? AND status = 'available'",
            [offerId]
        );

        if (!offer) {
            await conn.rollback();
            return res.status(400).json({ error: "Offer is no longer available." });
        }

        // Update the offer: assign this receiver and mark as accepted
        await conn.query(
            "UPDATE Food_offer SET receiver_id = ?, status = 'accepted' WHERE offer_id = ?",
            [receiverId, offerId]
        );

        // Create a notification for the receiver confirming the acceptance
        await conn.query(
            `INSERT INTO Notifications (message_title, message, type, user_id)
            VALUES ('Offer Accepted', ?, 'offer_accepted', (SELECT user_id FROM Receiver WHERE receiver_id = ?))`,
            [`You have successfully accepted the offer: "${offer.food_name}"`, receiverId]
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

// ──── 11. Get Receiver Profile ────
// Returns full profile data for the "My Profile" page.
// This endpoint returns more detail than the dashboard summary.
app.get("/api/receiver/profile/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        // Join all relevant tables to get everything the profile page needs
        const [rows] = await pool.query(`
            SELECT
                u.user_id,
                u.name,
                u.email,
                u.phone_number,
                u.status,
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
            JOIN Receiver r           ON r.user_id      = u.user_id
            JOIN Receiver_location rl ON rl.receiver_id = r.receiver_id
            JOIN Address a            ON a.address_id   = rl.address_id
            WHERE u.user_id = ?
            LIMIT 1
        `, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Profile not found." });
        }

        res.status(200).json({ profile: rows[0] });

    } catch (err) {
        console.error("Profile fetch error:", err);
        res.status(500).json({ error: "Failed to load profile." });
    }
});

// ──── 12. Mark Notification as Read ────
// Called when the user clicks on a notification.
app.patch("/api/receiver/notifications/:notificationId/read", async (req, res) => {
    const { notificationId } = req.params;

    try {
        // Set read_at to the current time, meaning the notification is now read
        await pool.query(
            "UPDATE Notifications SET read_at = NOW() WHERE notification_id = ?",
            [notificationId]
        );
        res.status(200).json({ message: "Notification marked as read." });
    } catch (err) {
        console.error("Notification read error:", err);
        res.status(500).json({ error: "Failed to update notification." });
    }
});









// ==============================================================
// ──────────────── START SERVER ────────────────────────────────
// ==============================================================
app.listen(5000, () => console.log("O&H - FeedHope"));
