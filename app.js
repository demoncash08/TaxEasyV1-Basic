const path = require("path");
const fs = require("fs");

const express = require("express");
const session = require("express-session");
const mongodbStore = require("connect-mongodb-session");
const bcrypt = require("bcryptjs");

const db = require("./data/database");

const MongoDBStore = mongodbStore(session);

const app = express();

const sessionStore = new MongoDBStore({
  uri: "mongodb://localhost:27017",
  databaseName: "taxeasy",
  collection: "sessions",
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: "super-secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
  })
);

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/personalInfo", async (req, res) => {
  // const [users] = await db.query("SELECT * FROM USERS");
  // res.render("personalInfo", { users: users });
});

app.post("/personalInfo", async (req, res) => {
  const data = [req.body.name, req.body.email];

  // await db.query("INSERT INTO users (name,email_id) VALUES (?)", [data]);

  res.redirect("incomeDetails");
});

app.get("/incomeDetails", (req, res) => {
  res.render("incomeDetails");
});

app.get("/businessIncome", (req, res) => {
  res.render("businessIncome");
});

app.get("/deductions", (req, res) => {
  res.render("deductions");
});

app.get("/totalTax", async (req, res) => {
  let email = req.session.user.email;
  const salary = await db
    .getDb()
    .collection("incomedetails")
    .findOne({ email: email });

  const businessIncome = await db
    .getDb()
    .collection("businessIncome")
    .findOne({ email: email });

  const deductions = await db
    .getDb()
    .collection("deductions")
    .findOne({ email: email });

  console.log(salary.salary);
  console.log(deductions.salary);
  console.log(businessIncome.salary);

  let totalIncome = parseInt(salary.salary) + parseInt(businessIncome.salary);
  let totalDeductions = parseInt(deductions.salary);

  console.log(totalIncome);
  console.log(totalDeductions);

  let netTaxableIncome = totalIncome - totalDeductions;
  let taxAmount = 0;
  console.log(netTaxableIncome);

  if (netTaxableIncome >= 500000 && netTaxableIncome < 750000) {
    taxAmount = 12500 + (netTaxableIncome - 500000) / 10;
  } else if (netTaxableIncome >= 750000 && netTaxableIncome < 1000000) {
    taxAmount = 37500 + ((netTaxableIncome - 750000) / 100) * 15;
  } else if (netTaxableIncome >= 1000000 && netTaxableIncome < 1250000) {
    taxAmount = 75000 + ((netTaxableIncome - 1000000) / 100) * 20;
  } else if (netTaxableIncome >= 1250000 && netTaxableIncome < 1500000) {
    taxAmount = 125000 + ((netTaxableIncome - 1250000) / 100) * 25;
  } else if (netTaxableIncome >= 1500000) {
    taxAmount = 187500 + ((netTaxableIncome - 1500000) / 100) * 30;
  }

  console.log(taxAmount);

  taxSummary = {
    totalIncome: totalIncome,
    totalDeductions: totalDeductions,
    taxAmount: taxAmount,
  };
  res.render("totalTax", { taxSummary: taxSummary });
});

app.post("/signup", async (req, res) => {
  const userData = req.body;
  const email = userData.email;
  const password = userData.password;

  const existingUser = await db
    .getDb()
    .collection("users")
    .findOne({ email: email });

  if (existingUser) {
    console.log("user exists");
    return res.redirect("/login");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = {
    email: email,
    password: hashedPassword,
  };

  await db.getDb().collection("users").insertOne(user);

  console.log("done");

  res.redirect("/login");
});

app.post("/login", async (req, res) => {
  const userData = req.body;
  const email = userData.email;
  const password = userData.password;

  const existingUser = await db
    .getDb()
    .collection("users")
    .findOne({ email: email });

  if (!existingUser) {
    console.log("user can not login");
    return res.redirect("/login");
  }

  const correctPassword = await bcrypt.compare(password, existingUser.password);

  if (!correctPassword) {
    console.log("user can not login - wrong password");
    return res.redirect("/login");
  }

  req.session.user = { id: existingUser._id, email: existingUser.email };
  req.session.isAuthenticated = true;

  req.session.save(() => {
    res.redirect("/incomeDetails");
  });
  // res.redirect("/incomeDetails");
});

app.post("/incomeDetails", async (req, res) => {
  let email = req.session.user.email;

  salaryIncome = {
    email: email,
    salary: req.body.income,
  };
  const result = await db
    .getDb()
    .collection("incomedetails")
    .insertOne(salaryIncome);
  console.log(result);

  res.redirect("businessIncome");
});

app.post("/businessIncome", async (req, res) => {
  let email = req.session.user.email;
  businessIncome = {
    email: email,
    salary: req.body.income,
  };
  const result = await db
    .getDb()
    .collection("businessIncome")
    .insertOne(businessIncome);
  console.log(result);
  res.redirect("deductions");
});

app.post("/deductions", async (req, res) => {
  let email = req.session.user.email;
  deductions = {
    email: email,
    salary: req.body.income,
  };
  const result = await db
    .getDb()
    .collection("deductions")
    .insertOne(deductions);
  console.log(result);
  res.redirect("totalTax");
});

db.connectToDatabase().then(function () {
  app.listen(3000);
});
