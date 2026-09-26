-- "Our toolkit" marquee, editable per region in Settings. Existing sites
-- start with the stack the services section already describes.

ALTER TABLE "SiteSettings" ADD COLUMN "techStack" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "SiteSettings" SET "techStack" = ARRAY[
  'Next.js', 'React', 'TypeScript', 'Node.js', 'PostgreSQL', 'React Native',
  'Flutter', 'Electron', 'Python', 'TensorFlow', 'PyTorch', 'OpenAI',
  'LangChain', 'OpenCV', 'Docker', 'AWS'
];
