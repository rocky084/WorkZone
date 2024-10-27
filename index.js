const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();
const port = 3000;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB!');
});

// Define schemas and models
const messageSchema = new mongoose.Schema({
    user: String,
    text: String,
    productId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Add productId
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    profile: { type: String, required: true },
    about: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Product schema and model
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    problem: { type: String, required: true },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    uname: { type: String, required: true }
});
const Product = mongoose.model('Product', productSchema);

// Middleware setup
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

// Set up session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions'
    }),
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.set("view engine", "ejs");

// Define routes
const routes = [
    { path: "/", view: "index" },
    { path: "/login", view: "login" },
    { path: "/signup", view: "signup" },
    { path: "/about", view: "about" },
    { path: "/service", view: "service" },
    { path: "/collab", view: "collab" },
    { path: "/abhay", view: "abhay" }
    
];

routes.forEach((route) => {
    app.get(route.path, (req, res) => {
        res.render(route.view);
    });
});

// User home route
app.get("/home", (req, res) => {
    if (!req.session.username) {
        return res.redirect("/login");
    }
    res.render("home", { username: req.session.username });
});

// User profile route
app.get("/user", async (req, res) => {
    if (!req.session.username) {
        return res.redirect("/login");
    }

    try {
        const products = await Product.find(); // Fetch products from the database
        res.render("user", { username: req.session.username, profile: req.session.profile, about: req.session.about, products: products || [] });
    } catch (err) {
        console.error(err);
        res.send("An error occurred. Please try again.");
    }
});

// Signup route
app.post("/signup", async (req, res) => {
    const data = {
        name: req.body.username,
        profile: req.body.profile,
        about: req.body.about,
        email: req.body.Email,
        password: req.body.password
    };

    const existingUser = await User.findOne({ name: data.name });
    const existingEmail = await User.findOne({ email: data.email });

    if (existingUser) {
        return res.send('User already exists. Please choose a different username.');
    }
    if (existingEmail) {
        return res.send('Email already exists. Please choose a different email.');
    }

    const saltRounds = 10; 
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    data.password = hashedPassword; 

    await User.create(data);
    res.render("login");
});

// Login user 
app.post("/login", async (req, res) => {
    try {
        const user = await User.findOne({ name: req.body.username });
        if (!user) {
            return res.send("User name cannot be found.");
        }

        const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
        if (!isPasswordMatch) {
            return res.send("Wrong Password.");
        }

        req.session.userId = user._id.toString();
        req.session.username = user.name;
        req.session.profile = user.profile;
        req.session.about = user.about;

        res.render("home", { username: user.name, profile: user.profile, about: user.about });
    } catch (error) {
        console.error(error);
        res.send("An error occurred. Please try again.");
    }
});

// Logout user
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.send("Could not log out. Please try again.");
        }
        res.redirect("/login");
    });
});

// Get chat messages for a specific product
app.get('/api/messages/:productId', async (req, res) => {
    try {
        const messages = await Message.find({ productId: req.params.productId }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Post new message with productId
app.post('/api/messages', async (req, res) => {
    try {
        const { user, text, productId } = req.body; // Get productId from request body
        const newMessage = new Message({ user, text, productId }); // Save productId
        await newMessage.save();
        res.status(201).send();
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route to handle product submission
app.post("/user", async (req, res) => {
    try {
        const { productName, problem, productDescription, uname } = req.body; 
        const newProduct = new Product({
            name: productName,
            problem: problem,
            description: productDescription,
            uname: uname
        });
        await newProduct.save();
        if(problem == "frontend"){
            res.redirect("/products1");
        }else if(problem== "backend"){
            req.redirect("/products2");
        }else if(problem== "cpp"){
            req.redirect("/products3");
        }else if(problem== "python"){
            req.redirect("/products4");
        }else if(problem== "java"){
            req.redirect("/products5");
        }else{
            req.redirect("/products");
        } 
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred. Please try again.");
    }
});

// Route to display products
app.get("/products", async (req, res) => {
    if (!req.session.username) {
        return res.redirect("/login");
    }
    res.render("home", { username: req.session.username });
    try {
        const products = await Product.find();
        res.render("products", { products, username: req.session.username });
    } catch (err) {
        console.error(err);
        res.send("An error occurred. Please try again.");
    }
});
app.get("/products6", async (req, res) => {
    try {
        const products6 = await Product.find();
        res.render("products6", { products6, username: req.session.username });

    } catch (err) {
        console.error(err);
        res.send("An error occurred. Please try again.");
    }
});
app.get("/products1", async (req, res) => {
    try {
        let query1 = {problem:"frontend"};
        const products1 = await Product.find(query1);
        res.render("products1", { products1, username: req.session.username, products: [] }); // or res.render('products1', { products: someProductArray }); });
    } catch (err) {
        console.error(err);
        res.send("An error occurred. Please try again.");
    }
});

app.get("/products2", async (req, res) => {
    try {
        let query2 = {problem:"backend"};
        const products2 = await Product.find(query2);
        res.render("products2", { products2, username: req.session.username });
    } catch (err) {
        console.error(err);
        res.send("An error occurred. Please try again.");
    }
});

app.get("/products3", async (req, res) => {
    try {
        let query3 = {problem:"cpp"};
        const products3 = await Product.find(query3);
        res.render("products3", { products3, username: req.session.username }); // or res.render('products1', { products: someProductArray }); });
    } catch (err) {
        console.error(err);
        res.send("An error occurred. Please try again.");
    }
});

app.get("/products4", async (req, res) => {
    try {
        let query4 = {problem:"python"};
        const products4 = await Product.find(query4);
        res.render("products4", { products4, username: req.session.username}); // or res.render('products1', { products: someProductArray }); });
    } catch (err) {
        console.error(err);
        res.send("An error occurred. Please try again.");
    }
});

app.get("/products5", async (req, res) => {
    try {
        let query5 = {problem:"java"};
        const products5 = await Product.find(query5);
        res.render("products5", { products5, username: req.session.username }); // or res.render('products1', { products: someProductArray }); });
    } catch (err) {
        console.error(err);
        res.send("An error occurred. Please try again.");
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
