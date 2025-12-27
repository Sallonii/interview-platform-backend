const express = require("express");
const path = require("path");
const cors = require("cors")

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
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};


app.get('/question-bank', async (request, response) => {
  const getQuestionBankQuery = `
  SELECT * FROM
  question_bank;
  `
  const questionBankArray = await db.all(getQuestionBankQuery);
  response.json(questionBankArray);
})

app.put("/questions/:id/bookmark", async (request, response) => {
  try {
    const { id } = request.params;

    const getQuery = `
      SELECT isBookmarked
      FROM question_bank
      WHERE id = ?
    `;
    const question = await db.get(getQuery, [id]);

    if (!question) {
      response.status(404).send({ error: "Question not found" });
      return;
    }
    const updatedValue = question.isBookmarked === 1 ? 0 : 1;


    const updateQuery = `
      UPDATE question_bank
      SET isBookmarked = ?
      WHERE id = ?
    `;
    await db.run(updateQuery, [updatedValue, id]);

    response.send({ isBookmarked: updatedValue });
  } catch (error) {
    response.status(500).send({ error: "Server error" });
  }
});
initializeDBAndServer();
