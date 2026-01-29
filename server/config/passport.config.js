const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db.js'); // Kết nối với MySQL pool
require('dotenv').config({
  path:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback', // URL ma Google chuyen toi sau xac thuc
    },
    (accessToken, refreshToken, profile, done) => {
      // Không cần kiểm tra hoặc thêm người dùng vào database ở đây
      // Chỉ trả về profile nhận được từ Google

      // console.log("Google profile:", JSON.stringify(profile, null, 2));

      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});
