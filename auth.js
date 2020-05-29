var passport = require("passport");
var GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;

// Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Google
//   profile), and invoke a callback with a user object.

passport.use(new GoogleStrategy({
  clientID: 234144093094-87cbgnr53r09mjjskfe15qbujjo0qpdq.apps.googleusercontent.com,
      clientSecret: 1ITHJYLFB3DDhJg1qpqjgceZ,
      callbackURL: "http://www.firstimpressions.xyz:3000/auth/google/callback",
  passReqToCallback   : true
},
function(request, accessToken, refreshToken, profile, done) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return done(err, user);
  });
}
));
