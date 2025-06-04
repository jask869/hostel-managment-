import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const app = express();
const PORT = process.env.PORT || 1067;

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.json());
app.use("/public", express.static("public"));

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/HostelManagement", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
    console.log("MongoDB Connected...");
});

// Schemas
const roomSchema = new mongoose.Schema({
    roomNumber: String,
    isOccupied: { type: Boolean, default: true },
    student: String,
    ID: String
});

const loginSchema = new mongoose.Schema({
    Id: String,
    fullName: String,
    email: { type: String, unique: true },
    password: String,
    type: { type: String, enum: ["admin", "student"] },
    Phone: String,
    Address: String,
    Stream: String,
    Year: String
});

const messBillSchema = new mongoose.Schema({
    Id: { type: String, required: true },
    studentName: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Paid', 'Unpaid'], default: 'Unpaid' },
});

const attendanceSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Login", required: true },
    Attendance: { type: String, required: true },
});

const complaintSchema = new mongoose.Schema({
    // Id: { type: String, required: true },
    studentName: { type: String, required: true },
    issue: { type: String, required: true },
    status: { type: String, enum: ['Resolved', 'Pending'], default: 'Pending' },
});

const eventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String, required: true }
});

// Models
const Complaint = mongoose.model('Complaint', complaintSchema);
const Attendances = mongoose.model("Attendances", attendanceSchema);
const MessBill = mongoose.model("MessBill", messBillSchema);
const Room = mongoose.model("Room", roomSchema);
const Login = mongoose.model("Login", loginSchema);
const Event = mongoose.model("Event", eventSchema);

// Routes

// Register



app.post('/Register', async (req, res) => {
    try {
      const { fullName, email, password, type } = req.body;
  
      console.log("Incoming registration data:", req.body);
  
      if (!fullName || !email || !password || !type) {
        console.log("Missing fields");
        return res.status(400).json({ message: 'All required fields must be filled' });
      }
  
      const existingUser = await Login.findOne({ email }); // Use Login instead of Student
      if (existingUser) {
        console.log("User already exists");
        return res.status(400).json({ message: 'User already exists' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const studentId = `${fullName.split(' ').join('').toLowerCase()}${Math.floor(Math.random() * 10000)}`;
  
      console.log("Creating user with ID:", studentId);
  
      const newUser = new Login({
        Id: studentId,
        fullName,
        email,
        password: hashedPassword,
        type,
      });
      
      console.log(newUser)
  
      await newUser.save();
  
      console.log("User registered:", newUser);
  
      res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ message: 'Server error' });
    }
});

// Login
app.post('/Login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await Login.findOne({ email });
        if (!user) {
            return res.status(401).json({ status: 'fail', message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ status: 'fail', message: 'Invalid password' });
        }

        res.json({
            status: 'success',
            type: user.type,
            fullName: user.fullName,
            id: user._id,
        });        
    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).json({ message: "Login failed. Try again later." });
    }
});

app.post('/addLogin', async (req, res) => {
    try {
      const { email, password } = req.body;
      // Your logic to create a login entry, validate, hash, etc.
      res.status(200).json({ message: "Login created successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error creating login" });
    }
  });
  


// Students
app.get("/listStudents", async(req, res) => {
    try {
        const students = await Login.find({ type: "student" });
        res.json(students);
    } catch (error) {
        console.error("Error fetching students:", error.message);
        res.status(500).json({ message: "Error fetching students." });
    }
});

app.put("/UpdateStudent/:id", async(req, res) => {
    const { id } = req.params;
    const { fullName, email, password, Phone, Address, Stream, Year } = req.body;

    try {
        const updateFields = { fullName, email, Phone, Address, Stream, Year };

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.password = hashedPassword;
        }

        const updatedStudent = await Login.findOneAndUpdate({ Id: id }, updateFields, { new: true });

        if (!updatedStudent) {
            return res.status(404).json({ message: "Student not found." });
        }

        res.status(200).json({ message: "Student updated successfully.", updatedStudent });
    } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

app.delete('/deleteStudents/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const deletedStudent = await Login.findByIdAndDelete(studentId);  // Use Login model here
  
        if (!deletedStudent) {
            return res.status(404).send({ message: "Student not found" });
        }
  
        res.status(200).send({ message: "Student deleted successfully" });
    } catch (error) {
        console.error(`Error occurred while deleting student with ID ${req.params.id}: `, error);
        res.status(500).send({ message: "Error deleting student", error: error.message });
    }
});

  
  
  

// Rooms
app.post("/Rooms", async(req, res) => {
    const { roomNumber, isOccupied, student, ID } = req.body;

    if (!roomNumber || !student || !ID) {
        return res.status(400).json({ message: "Room number, student, and ID are required." });
    }

    try {
        const room = new Room({ roomNumber, isOccupied, student, ID });
        await room.save();

        res.status(201).json({ message: "Room successfully allotted.", room });
    } catch (error) {
        console.error("Error allotting room:", error);
        res.status(500).json({ message: "Failed to allot room." });
    }
});

// Mess Bill
app.post("/messBills", async(req, res) => {
    const { Id, studentName, amount, status } = req.body;

    if (!Id || !studentName || !amount) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const newMessBill = new MessBill({ Id, studentName, amount, status: status || "Unpaid" });
        await newMessBill.save();
        res.status(201).json({ message: "Mess bill added successfully." });
    } catch (error) {
        console.error("Error adding mess bill:", error.message);
        res.status(500).json({ error: "Failed to add mess bill." });
    }
});

// Attendance
// app.post("/attendance", async(req, res) => {
//     const { Id, studentName, Attendance } = req.body;

//     if (!Id || !studentName || !Attendance) {
//         return res.status(400).json({ error: "All fields are required." });
//     }

//     try {
//         const newAttendance = new Attendances({ Id, studentName, Attendance });
//         await newAttendance.save();
//         res.status(201).json({ message: "Attendance recorded successfully." });
//     } catch (error) {
//         console.error("Error recording attendance:", error.message);
//         res.status(500).json({ error: "Failed to record attendance." });
//     }
// });

app.get("/attendance", async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: "Student ID is required." });

        const records = await Attendances.find({ Id: id }); // match the field correctly
        if (!records.length) return res.status(404).json({ message: "No attendance found." });

        res.status(200).json(records);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});


// Room & Bill fetch
app.get("/Fetchroom", async(req, res) => {
    try {
        const { student } = req.query;
        const filter = student ? { student } : {};
        const rooms = await Room.find(filter);
        res.status(200).json(rooms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/FetchBill", async(req, res) => {
    try {
        const { student } = req.query;
        const filter = student ? { student } : {};
        const bills = await MessBill.find(filter);
        res.status(200).json(bills);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Complaint
app.post("/complaints", async(req, res) => {
    try {
        const { studentName, description } = req.body;

        if (!studentName || !description) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const complaint = new Complaint({
            studentName,
            issue: description,
        });

        await complaint.save();

        res.status(200).json({ message: "Complaint received successfully." });
    } catch (error) {
        console.error("Error submitting complaint:", error.message);
        res.status(500).json({ error: "Failed to submit complaint." });
    }
});

app.get('/complaints', async(req, res) => {
    try {
        const complaints = await Complaint.find();
        res.status(200).json(complaints);
    } catch (error) {
        console.error("Error fetching complaints:", error.message);
        res.status(500).json({ error: "Failed to fetch complaints." });
    }
});

// Student Bio
app.post("/Student", async(req, res) => {
    try {
        const studentId = req.body.u_id;
        if (!studentId) {
            return res.status(400).json({ message: "Student ID is required." });
        }

        const students = await Login.find({ type: "student", Id: studentId });
        if (students.length === 0) {
            return res.status(404).json({ message: "No student found." });
        }

        res.json(students);
    } catch (error) {
        console.error("Error fetching students:", error.message);
        res.status(500).json({ message: "Error fetching students." });
    }
});

// Events
app.get('/events', async (req, res) => {
    try {
        const events = await Event.find();
        res.status(200).json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/events', async (req, res) => {
    const { name, date, description } = req.body;

    if (!name || !date || !description) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const newEvent = new Event({ name, date, description });
        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Payment Details
app.post('/paymentdetails', async(req, res) => {
    console.log(req.body);
    console.log("Payment received.");
    res.status(200).json({ message: "Payment received." });
});

// Server Start
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
