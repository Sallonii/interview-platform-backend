const express = require("express");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = "MY_SECRET_TOKEN";

const dbPath = path.join(__dirname, "tech.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  console.log("Auth Header:", authHeader);
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
    console.log(jwtToken);
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, JWT_SECRET, async (error, user) => {
      if (error) {
        response.status(401);
        response.send("Invalid Token");
      } else {
        request.user = user;
        next();
      }
    });
  }
};

const validatePassword = (password) => {
  return password.length >= 6;
}

app.post("/register", async (request, response) => {
  try{
    const { username, password } = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const checkUserQuery = `SELECT * FROM users WHERE username = ?;`;
    const databaseUser = await db.get(checkUserQuery, [username]);

    if (databaseUser === undefined) {
      const createUserQuery = `
        INSERT INTO users (username, password)
        VALUES (?, ?);`;
      if(validatePassword(password)){
        await db.run(createUserQuery, [username, hashedPassword]);
        response.status(200).json({error_msg: "User created successfully"});
      }else{
        response.status(400).json({error_msg: "Password is too short" });
      }
    } else {
      response.status(400).json({error_msg: "User already exists"});
    }
  }catch (error) {
    response.status(500).json({error_msg:"Server error"});
  }
});

app.post("/login", async (request, response) => {
  try{
    const {username, password} = request.body;
    const selectUserQuery = `SELECT * FROM users WHERE username = ?;`;
    const databaseUser = await db.get(selectUserQuery, [username]);

    if (databaseUser === undefined) {
      response.status(400).json({ error_msg: "Invalid User" });
    }else{
      const isPasswordMatched = await bcrypt.compare(password, databaseUser.password);
      if(isPasswordMatched){
        const token = jwt.sign({username: databaseUser.username }, JWT_SECRET, {expiresIn: "1h"});
        response.status(200).send({token});
      }else{
        response.status(400).json({ error_msg: "Invalid Password" });
      }
    }
  }catch (error){
    response.status(500).json({ error_msg: "Server error" });
  }
})

app.get("/question-bank", authenticateToken, async (request, response) => {
  const query = `SELECT * FROM question_bank;`;
  const data = await db.all(query);
  response.json(data);
});

app.put("/questions/:id/bookmark", authenticateToken, async (request, response) => {
  try {
    const { id } = request.params;

    const question = await db.get(
      `SELECT isBookmarked FROM question_bank WHERE id = ?`,
      [id]
    );

    if (!question) {
      response.status(404).json({ error: "Question not found" });
      return;
    }

    const updatedValue = question.isBookmarked === 1 ? 0 : 1;

    await db.run(
      `UPDATE question_bank SET isBookmarked = ? WHERE id = ?`,
      [updatedValue, id]
    );

    response.json({ isBookmarked: updatedValue });
  } catch (error) {
    response.status(500).json({ error: "Server error" });
  }
});

initializeDBAndServer();
