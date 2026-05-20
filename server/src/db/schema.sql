CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  estimated_hours INTEGER NOT NULL,
  roadmap JSONB NOT NULL,
  agents_trace JSONB NOT NULL,
  personalization JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  module_order INTEGER NOT NULL,
  summary TEXT NOT NULL,
  learning_objectives JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  module_id TEXT REFERENCES modules(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  duration TEXT,
  thumbnail TEXT,
  channel_title TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  transcript TEXT,
  semantic_score DOUBLE PRECISION DEFAULT 0,
  quality_score DOUBLE PRECISION DEFAULT 0,
  summary TEXT,
  key_takeaways JSONB NOT NULL,
  flashcards JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  video_id TEXT REFERENCES videos(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT REFERENCES videos(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  quiz_score DOUBLE PRECISION DEFAULT 0,
  watched_percentage DOUBLE PRECISION DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT REFERENCES videos(id) ON DELETE CASCADE,
  score DOUBLE PRECISION NOT NULL,
  total INTEGER NOT NULL,
  weak_areas JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
