const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve the login page (before static middleware)
app.get('/', (req, res) => {
    console.log('Root route hit, serving auth.html');
    res.sendFile('auth.html', { root: __dirname });
});

// Static file serving
app.use(express.static(path.join(__dirname, 'form')));
app.use(express.static(__dirname));

// XML file path
const XML_FILE = path.join(__dirname, 'customers.xml');

// Initialize XML file if it doesn't exist
function initializeXMLFile() {
    if (!fs.existsSync(XML_FILE)) {
        const initialXML = `<?xml version="1.0" encoding="UTF-8"?>
<customers>
</customers>`;
        fs.writeFileSync(XML_FILE, initialXML, 'utf8');
    }
}

// Read customers from XML file
function readCustomersFromXML() {
    const xmlContent = fs.readFileSync(XML_FILE, 'utf8');
    // Simple XML parsing (in production, use a proper XML parser)
    const customerRegex = /<customer>([\s\S]*?)<\/customer>/g;
    const customers = [];
    let match;
    
    while ((match = customerRegex.exec(xmlContent)) !== null) {
        const customerXML = match[1];
        const customer = {
            id: parseInt(customerXML.match(/<id>(\d+)<\/id>/)[1]),
            name: customerXML.match(/<name>(.*?)<\/name>/)[1],
            surname: customerXML.match(/<surname>(.*?)<\/surname>/)[1],
            email: customerXML.match(/<email>(.*?)<\/email>/)[1],
            newsletter: customerXML.match(/<newsletter>(.*?)<\/newsletter>/)[1] === 'true',
            timestamp: customerXML.match(/<timestamp>(.*?)<\/timestamp>/)[1]
        };
        customers.push(customer);
    }
    
    return customers;
}

// Write customer to XML file
function writeCustomerToXML(customer) {
    const xmlContent = fs.readFileSync(XML_FILE, 'utf8');
    const customerXML = `    <customer>
        <id>${customer.id}</id>
        <name>${customer.name}</name>
        <surname>${customer.surname}</surname>
        <email>${customer.email}</email>
        <newsletter>${customer.newsletter}</newsletter>
        <timestamp>${customer.timestamp}</timestamp>
    </customer>`;
    
    const updatedXML = xmlContent.replace('</customers>', customerXML + '\n</customers>');
    fs.writeFileSync(XML_FILE, updatedXML, 'utf8');
}

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

// Simple user storage (in production, use a proper database)
let users = [];

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        res.json({ message: 'Login successful', user: { username: user.username, email: user.email } });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Register endpoint
app.post('/api/register', (req, res) => {
    const { username, password, email } = req.body;
    
    if (!username || !password || !email) {
        return res.status(400).json({ error: 'All fields required' });
    }
    
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    
    const newUser = { username, password, email, accessGranted: false, createdAt: new Date().toISOString() };
    users.push(newUser);
    
    res.status(201).json({ message: 'Registration successful', user: { username: newUser.username, email: newUser.email } });
});

// Get current user verification status
app.get('/api/users/me', (req, res) => {
    // For demo purposes, return the first user or a demo user
    // In production, you'd use authentication to identify the user
    const user = users[0] || { username: 'demo', accessGranted: true };
    
    if (user) {
        res.json({ username: user.username, email: user.email, accessGranted: user.accessGranted });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Handle form submission
app.post('/api/customers', (req, res) => {
    const { name, surname, email, newsletter } = req.body;
    
    // Validate required fields
    if (!name || !surname || !email) {
        return res.status(400).json({ 
            error: 'Name, surname, and email are required' 
        });
    }
    
    // Get current customers to determine next ID
    const customers = readCustomersFromXML();
    
    // Create customer object
    const customer = {
        id: customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 1,
        name,
        surname,
        email,
        newsletter: newsletter || false,
        timestamp: new Date().toISOString()
    };
    
    // Write customer to XML file
    writeCustomerToXML(customer);
    
    console.log('New customer registered:', customer);
    
    res.status(201).json({ 
        message: 'Customer registered successfully',
        customer 
    });
});

// Get all customers
app.get('/api/customers', (req, res) => {
    const customers = readCustomersFromXML();
    res.json(customers);
});

// View XML file
app.get('/customers.xml', (req, res) => {
    res.sendFile(XML_FILE);
});

// Start server
app.listen(PORT, () => {
    // Initialize XML file
    initializeXMLFile();
    
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Form available at http://localhost:${PORT}/`);
    console.log(`API endpoint: http://localhost:${PORT}/api/customers`);
    console.log(`XML file available at http://localhost:${PORT}/customers.xml`);
});