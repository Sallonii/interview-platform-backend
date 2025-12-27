const express = require("express");
const path = require("path");
const cors = require("cors");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
app.use(cors());

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

app.get("/question-bank", async (request, response) => {
  const query = `SELECT * FROM question_bank;`;
  const data = await db.all(query);
  response.json(data);
});

app.put("/questions/:id/bookmark", async (request, response) => {
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
