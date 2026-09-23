-- Migration: Add brand, description, and video_url to machines table
-- Run this on existing databases to update the schema and seed data.

ALTER TABLE machines ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Remove old seed data
DELETE FROM machines WHERE name IN (
  'Chest Press', 'Lat Pulldown', 'Shoulder Press', 'Cable Row',
  'Bicep Curl Machine', 'Tricep Pushdown', 'Leg Press', 'Leg Extension',
  'Leg Curl', 'Calf Raise Machine', 'Cable Crunch', 'Treadmill'
);

-- Insert FlyeFit gym machines (skip duplicates)
INSERT INTO machines (name, category, brand, description, video_url) VALUES
  ('Treadmill', 'cardio', 'Life Fitness', 'Motorized belt for walking, jogging, and running with adjustable speed and incline.', 'https://www.youtube.com/watch?v=8iPEnn-ltC8'),
  ('Stairmaster', 'cardio', 'Shua', 'Revolving staircase simulator that builds lower-body endurance and cardiovascular fitness.', 'https://www.youtube.com/watch?v=VCIe9LOh5eY'),
  ('Glutes and Hamstring Developer', 'lower', 'Exigo', 'Targets the glutes and hamstrings through a hip extension movement on a padded bench.', 'https://www.youtube.com/watch?v=B2uoBJJETkI'),
  ('Smith Machine', 'upper', 'Exigo', 'Guided barbell on fixed vertical rails for pressing, squatting, and rowing movements.', 'https://www.youtube.com/watch?v=KSalJ1bOufU'),
  ('Ski Erg', 'cardio', 'Concept 2', 'Simulates Nordic skiing with a pull-down motion for full-body cardiovascular training.', 'https://www.youtube.com/watch?v=NU_BQajMDHg'),
  ('Rowing Machine', 'cardio', 'Concept 2', 'Full-body cardiovascular exercise using a sliding seat and handle for a rowing stroke.', 'https://www.youtube.com/watch?v=EgYJmnQa6vg'),
  ('Stationary Bike', 'cardio', 'Concept 2', 'Fixed cycling station for low-impact cardiovascular conditioning and leg endurance.', 'https://www.youtube.com/watch?v=9OcjMagV99g'),
  ('Plate Loaded Hip Extension', 'lower', 'Strength Max', 'Isolates the glutes and hamstrings by driving the hips backward against plate-loaded resistance.', 'https://www.youtube.com/watch?v=AnCkO0j6fgw'),
  ('Plate Loaded Seated Row', 'upper', 'Panatta', 'Plate-loaded machine targeting the mid-back and lats with a seated horizontal pull.', 'https://www.youtube.com/watch?v=GZbfZ033f74'),
  ('Plate Loaded Incline Chest Press', 'upper', 'Panatta', 'Targets the upper chest and front deltoids with an incline pressing motion using plates.', 'https://www.youtube.com/watch?v=SrqOu55lrYU'),
  ('Shoulder Press Machine', 'upper', 'Hammer Strength', 'Targets the deltoids and triceps with an overhead pressing motion on a lever system.', 'https://www.youtube.com/watch?v=HzIIIpMhGBk'),
  ('Decline Chest Press Machine', 'upper', 'Hammer Strength', 'Emphasises the lower chest and triceps with a downward-angled pressing path.', 'https://www.youtube.com/watch?v=xK9zpReAaFc'),
  ('Lateral Raise Machine', 'upper', 'Hammer Strength', 'Isolates the medial deltoids by raising the arms out to the sides against resistance.', 'https://www.youtube.com/watch?v=6BmU5FPyYFE'),
  ('Calf Raise', 'lower', 'Hammer Strength', 'Isolates the calf muscles through a standing or seated heel-raise against loaded resistance.', 'https://www.youtube.com/watch?v=RBiMOqGnMSc'),
  ('Squat Lunge Drive', 'lower', 'Hammer Strength', 'Plate-loaded machine that trains squat and lunge patterns with a guided foot platform.', 'https://www.youtube.com/watch?v=G_5sCHODAJg'),
  ('Reverse Hyper Extension & Back Extension', 'core', 'Hammer Strength', 'Strengthens the posterior chain (lower back, glutes and hamstrings) via hip extension.', 'https://www.youtube.com/watch?v=ZeRsNzFcQLQ'),
  ('Plate Loaded Leg Extension', 'lower', 'Hammer Strength', 'Isolates the quadriceps by extending the knees against plate-loaded resistance.', 'https://www.youtube.com/watch?v=ljO4jkwv8wQ'),
  ('Iso Lying Leg Curl', 'lower', 'Hammer Strength', 'Isolates each hamstring independently in a lying position with a curling motion.', 'https://www.youtube.com/watch?v=1FNGMoMuGOA'),
  ('Assisted Nordic Curl', 'lower', 'Hammer Strength', 'Band- or lever-assisted Nordic curl targeting the hamstrings eccentrically.', 'https://www.youtube.com/watch?v=Wnx13YAGKWA'),
  ('Tricep Pushdown', 'upper', 'Gymleco', 'Cable-based exercise isolating the triceps through an elbow extension pushdown.', 'https://www.youtube.com/watch?v=2-LAMcpzODU'),
  ('Plate Loaded T-Bar Row', 'upper', 'Gymleco', 'Targets the mid-back and lats by rowing a pivoting barbell loaded with plates.', 'https://www.youtube.com/watch?v=j3Igk5nyZE4'),
  ('Standing Chest Press', 'upper', 'Gymleco', 'Plate-loaded press performed from a standing position to engage the chest and core.', 'https://www.youtube.com/watch?v=8urE8Z4FV18'),
  ('Plate Loaded Horizontal Leg Press', 'lower', 'Gymleco', 'Targets the quads, glutes, and hamstrings by pressing a sled horizontally with plates.', 'https://www.youtube.com/watch?v=IZxyjW7MPJQ'),
  ('Plate Loaded Pendulum Squat', 'lower', 'Gymleco', 'Guided squat machine with a pendulum arm that emphasises the quads and glutes.', 'https://www.youtube.com/watch?v=g6EUlCDpRrc'),
  ('Plate Loaded Hack Squat', 'lower', 'Gymleco', 'Angled sled machine targeting the quads with a deep squatting motion using plates.', 'https://www.youtube.com/watch?v=0tn5K9NlCGc'),
  ('Plate Loaded Leg Press', 'lower', 'Gymleco', 'Seated press targeting the quads, glutes, and hamstrings by pushing a plate-loaded sled.', 'https://www.youtube.com/watch?v=IZxyjW7MPJQ'),
  ('Cable Machine - Bicep Curl', 'upper', 'Gymleco', 'Cable-based exercise isolating the biceps through a curling motion with constant tension.', 'https://www.youtube.com/watch?v=NFzTWp2qpiE'),
  ('Cable Machine - Chest Fly', 'upper', 'Gymleco', 'Cable-based fly movement targeting the chest through a wide arcing motion.', 'https://www.youtube.com/watch?v=Iwe6AmxVf7o')
ON CONFLICT (name) DO UPDATE SET
  brand = EXCLUDED.brand,
  description = EXCLUDED.description,
  video_url = EXCLUDED.video_url,
  category = EXCLUDED.category;
