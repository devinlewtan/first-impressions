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
app.use(bodyParser.urlencoded({ extended: true }));
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

// const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;
// (auth = require("./auth")),
const cookieParser = require("cookie-parser");

//   (cookieSession = require("cookie-session"));

// app.use(
//   cookieSession({
//     name: "session",
//     keys: ["123"],
//   })
// );
app.use(cookieParser());

// passport.use(new GoogleStrategy({
//   clientID: %your_client_ID%,
//   clientSecret: %your_client_secret%,
//   callbackURL: %your_callback_url%
// },
// (token, refreshToken, profile, done) => {
//   return done(null, {
//       profile: profile,
//       token: token
//   });
// }));

//CUSTOM MIDDLEWARE
app.use(function (req, res, next) {
  if (req.user) {
    res.locals.currentUser = req.user;
  }
  next();
});

app.use(function (req, res, next) {
  if (req.body.userGuess) {
    res.locals.userGuess = req.body.userGuess;
  }
  next();
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

//ROUTES
//should render random question from database (and the image of the associated user profile)
app.get("/", (req, res) => {
  let cookies = req.cookies;

  let questionAnswered = [];
  if (!!cookies["questionAnswered"]) {
    questionAnswered = JSON.parse(cookies["questionAnswered"]);
  }
  //generate random index
  const random = function (max) {
    return Math.floor(Math.random() * Math.floor(max));
  };
  //grab random question from random profile
  Profile.find(
    {
      question_ids: {
        $exists: true,
        $not: { $size: 0 },
        $nin: questionAnswered,
      },
    },
    function (err, profiles) {
      if (err) {
        console.log(err);
        res.send(err.message);
      } else if (profiles.length === 0) {
        res.render("noMore");
      } else {
        let prof = profiles[random(profiles.length)];
        let ques = Array.from(prof.question_ids)[
          random(prof.question_ids.length)
        ];
        Question.find({ _id: ques }, function (err, q) {
          if (err) {
            console.log(err);
            res.render("play", { error: err.message });
          } else {
            //render profile picture and random question
            res.render("play", {
              question: q[0],
              image: prof.image.data,
            });
          }
        });
      }
    }
  );
});

app.post("/", (req, res) => {
  const { question_id, userGuess } = req.body;
  Question.updateOne(
    { _id: question_id, "answers.letter": userGuess },
    { $inc: { "answers.$.timesVoted": 1 } },
    (err, res) => {
      if (err) throw err;
      console.log(res.nModified, " document(s) updated");
    }
  );
  Question.find({ _id: question_id }, function (err, q) {
    if (err) {
      console.log(err);
      res.render("play", { error: err.message });
    } else {
      Profile.find({ user_id: q[0].profile_id }, (err, p) => {
        if (err) {
          console.group(err.message);
        }
        let totalVotes = 0;
        //pass in total votes for question by accumulating guesses
        q = JSON.parse(JSON.stringify(q));
        q[0].answers.map((a) => (totalVotes += a.timesVoted));
        let cookie = req.cookies;
        let questionAnswered = [];
        if (!!cookie["questionAnswered"]) {
          questionAnswered = JSON.parse(cookie["questionAnswered"]);
        }
        questionAnswered.push(question_id);
        res.cookie("questionAnswered", JSON.stringify(questionAnswered));

        res.render("playResult", {
          question: q[0],
          image: p[0].image.data,
          userGuess: userGuess,
          totalVotes: totalVotes,
        });
      });
    }
  });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res, next) => {
  User.register(
    new User({
      username: req.body.username,
    }),
    req.body.password,
    function (err, user) {
      if (err) {
        return res.render("register", { error: err.message });
      } else {
        passport.authenticate("local")(req, res, function () {
          return res.redirect("/profile");
        });
      }
    }
  );
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["https://www.googleapis.com/auth/userinfo.profile"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    req.session.token = req.user.token;
    res.redirect("/");
  }
);

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
      res.render("profile", { error: err.message });
    } else {
      //create default profile for new user
      if (profile.length === 0) {
        const defaultProf = new Profile({
          user_id: req.user.username,
          image: {
            data: "",
            contentType: "image/png",
          },
          question_ids: [],
        });
        defaultProf.save((err, savedProf) => {
          if (err) {
            console.log(err);
          }
          res.render("profile");
        });
      } else {
        //find questions by their ids
        Question.find({ profile_id: req.user.username }, function (
          err,
          questions
        ) {
          if (err) {
            console.log(err);
            res.render("profile", { error: err.message });
          } else {
            const question_ids = questions.map((q) => q._id);
            Profile.updateOne(
              { user_id: req.user.username },
              { question_ids: question_ids },
              function (err, updatedProf) {
                if (err) {
                  console.log(err);
                  res.render("profile", { err: err.message });
                }
              }
            );
            const profileImage = profile[0].image.data;
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
            res.render("profile", { error: err.message });
          } else {
            console.log(savedQues, "has been added to db!");
            res.redirect("/profile");
          }
        });
      } else if (err) {
        console.log(err);
        res.render("profile", { err: err.message });
      } else {
        res.redirect("/profile");
      }
    }
  );
});

app.post(
  "/profile/questions/delete",
  connectEnsureLogin.ensureLoggedIn(),
  (req, res) => {
    const question_id = req.body.questionId;
    Question.deleteOne({ _id: question_id }, function (err, success) {
      if (err) console.log(err);
      console.log(success, "Successful deletion");
    });
    Profile.updateOne(
      { question_ids: { $elemMatch: { question_id } } },
      (err, prof) => {
        if (err) console.log(err.message);
        res.redirect("/profile");
      }
    );
  }
);

app.post("/profile/delete", connectEnsureLogin.ensureLoggedIn(), (req, res) => {
  Question.deleteMany(
    { profile_id: req.user.username },
    (err, deletedQuestions) => {
      if (err) {
        return res.render("/profile", { error: err.message });
      } else {
        console.log(deletedQuestions.deletedCount, "questions deleted");
      }
    }
  );
  Profile.deleteOne({ user_id: req.user.username }, (err, deletedProfile) => {
    if (err) {
      return res.render("/profile", { error: err.message });
    } else {
      console.log(deletedProfile.deletedCount, "profiles deleted");
    }
  });
  User.deleteOne({ username: req.user.username }, (err, deletedUser) => {
    if (err) {
      return res.render("/profile", { error: err.message });
    } else {
      console.log(deletedUser.deletedCount, "accounts deleted");
      req.logout();
      return res.redirect("/");
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
  if (!req.file) {
    // If Submit was accidentally clicked with no file selected...
    res.render("profile", { error: "Please select a picture file to submit!" });
  } else {
    const newImg = fs.readFileSync(req.file.path);
    const encImg = newImg.toString("base64");
    const newItem = {
      contentType: req.file.mimetype,
      data: encImg,
    };
    Profile.updateOne(
      { user_id: req.user.username },
      { image: newItem },
      (err, savedProf) => {
        if (err) {
          console.log(err);
          res.send(err);
        } else {
          console.log(savedProf.nModified, "document(s) updated");
          res.redirect("/profile");
        }
      }
    );
  }
});

const port = 3000;
app.listen(process.env.PORT || 3000);
console.log(`server started on port ${port}`);
