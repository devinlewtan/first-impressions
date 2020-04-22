// app.js
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const fs = require("fs");
const db = require("./db.js");
const bodyParser = require("body-parser");

const app = express();
app.set("view engine", "hbs");

//SETTINGS
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));

//MODELS
const User = mongoose.model("User");
const Profile = mongoose.model("Profile");
const Question = mongoose.model("Question");

// SESSIONS
const session = require("express-session");
app.use(
  session({
    secret: "secret for signing session id",
    resave: false,
    saveUninitialized: false,
  })
);

//PASSPORT
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");

app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//CUSTOM MIDDLEWARE
app.use(function (req, res, next) {
  if (req.user) {
    res.locals.currentUser = req.user;
  }
  next();
});

//ROUTES
//should render random question from database (and the image of the associated user profile)
app.get("/", (req, res) => {
  //generate random index
  const random = function (max) {
    return Math.floor(Math.random() * Math.floor(max));
  };
  //grab random question from random profile
  Profile.find(
    { question_ids: { $exists: true, $not: { $size: 0 } } },
    function (err, profiles) {
      if (err) {
        console.log(err);
        res.send(err.errmsg);
      } else {
        let prof = profiles[random(profiles.length)];
        let ques = Array.from(prof.question_ids)[
          random(prof.question_ids.length)
        ];
        Question.find({ _id: ques }, function (err, q) {
          if (err) {
            console.log(err);
            res.render("play", { error: err.errmsg });
          } else {
            //render profile picture and random question
            res.render("play", { question: q, image: prof.image });
          }
        });
      }
    }
  );
});

app.post("/", (req, res) => {
  const { question_id, userGuess } = req.body;
  console.log(req.body);
  Question.find({ _id: question_id }, function (err, q) {
    if (err) {
      console.log(err);
      res.render("play", { error: err.errmsg });
    } else {
      let style = "";
      if (userGuess === q.correctAnswer) {
        style = "color:green; font-weight:bold;";
      } else {
        style = "color:red; font-weight:bold;";
      }
      res.render("play", { question: q });
    }
  });
  Question.updateOne(
    { _id: question_id, "answers.letter": userGuess },
    { $inc: { "answers.$.timesVoted": 1 } },
    (err, res) => {
      if (err) throw err;
      console.log(res, " document(s) updated");
    }
  );
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  User.register(
    new User({
      username: req.body.username,
    }),
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.render("register");
      } else {
        passport.authenticate("local")(req, res, function () {
          //res.redirect("/profile");
          console.log("success");
          return res.redirect("/profile");
        });
      }
    }
  );
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.render("login", {
        error: "Password or username is incorrect!",
      });
    }
    req.logIn(user, function (err) {
      if (err) {
        return next(err);
      }
      return res.redirect("/profile");
    });
  })(req, res, next);
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.get("/profile", connectEnsureLogin.ensureLoggedIn(), (req, res) => {
  //render image and questions
  Profile.find({ user_id: req.user.username }, function (err, profile) {
    if (err) {
      console.log(err);
      res.render("profile", { error: err.errmsg });
    } else {
      //create default profile for new user
      if (profile.length === 0) {
        const defaultProf = new Profile({
          user_id: req.user.username,
          image: { data: "", contentType: "" },
          question_ids: [],
        });
        defaultProf.save((err, savedProf) => {
          if (err) {
            console.log(err);
            res.render("profile", { error: err.errmsg });
          }
        });
      } else {
        //find questions by their ids
        Question.find({ profile_id: req.user.username }, function (
          err,
          questions
        ) {
          if (err) {
            console.log(err);
            res.render("profile", { error: err.errmsg });
          } else {
            const question_ids = questions.map((q) => q._id);
            Profile.updateOne(
              { user_id: req.user.username },
              { question_ids: question_ids },
              function (err, updatedProf) {
                if (err) {
                  console.log(err);
                  res.render(profile, { err: err.errmsg });
                }
              }
            );
            const profileImage = profile.image;
            console.log(profileImage);
            res.render("profile", {
              image: profileImage,
              questions: questions,
            });
          }
        });
      }
    }
  });
});

app.post("/profile", (req, res) => {
  const newQuestion = new Question({
    profile_id: req.user.username,
    question: req.body.question,
    answers: [
      { letter: "a", value: req.body.a, timesVoted: 0 },
      { letter: "b", value: req.body.b, timesVoted: 0 },
      { letter: "c", value: req.body.c, timesVoted: 0 },
      { letter: "d", value: req.body.d, timesVoted: 0 },
    ],
    correctAnswer: req.body.correctAnswer,
  });
  Question.find(
    { profile_id: req.user.username, question: req.body.question },
    function (err, q) {
      if (q.length === 0) {
        newQuestion.save((err, savedQues) => {
          if (err) {
            console.log(err);
            res.render("profile", { error: err.errmsg });
          } else {
            console.log(savedQues, "has been added to db!");
            res.redirect("/profile");
          }
        });
      } else if (err) {
        console.log(err);
        res.render("profile", { err: err.errmsg });
      } else {
        res.redirect("/profile");
      }
    }
  );
});

app.get("/profile/results", connectEnsureLogin.ensureLoggedIn(), (req, res) => {
  //find questions by their ids
  Question.find({ profile_id: req.user.username }, function (err, questions) {
    if (err) {
      console.log(err);
      res.render("profile", { error: err.errmsg });
    } else {
      res.render("results", { questions: questions });
    }
  });
});

//storing images in db
const multer = require("multer");
const upload = multer({
  limits: { fileSize: 2000000 },
  dest: "./public/images/",
});
app.post("/uploadpicture", upload.single("picture"), (req, res) => {
  console.log("req file", req.file);
  if (!req.file) {
    // If Submit was accidentally clicked with no file selected...
    res.render("profile", { error: "Please select a picture file to submit!" });
  } else {
    const newImg = fs.readFileSync(req.file.path);
    const encImg = newImg.toString("base64");

    const newItem = {
      contentType: req.file.mimetype,
      data: Buffer.from(encImg, "base64"),
    };
    Profile.updateOne(
      { user_id: res.locals.user },
      { image: newItem },
      (err, savedProf) => {
        if (err) {
          console.log(err);
          res.send(err);
        } else {
          console.log("success", savedProf);
          res.redirect("/profile");
        }
      }
    );
  }
});

const port = 3000;
app.listen(port);
console.log(`server started on port ${port}`);
