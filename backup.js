import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Ensure backups directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFolder = path.join(BACKUP_DIR, `backup-${timestamp}`);
  fs.mkdirSync(backupFolder, { recursive: true });

  console.log(`[Backup Utility] Starting database backup into: ${backupFolder}`);

  const hasMongo = !!process.env.MONGODB_URI;

  if (hasMongo) {
    try {
      console.log('[Backup Utility] Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI);

      // Define standard model schemas for backup extraction
      const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
      const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
      const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }));

      const collections = [
        { name: 'users', model: User },
        { name: 'bookings', model: Booking },
        { name: 'sessions', model: Session }
      ];

      for (const col of collections) {
        console.log(`[Backup Utility] Fetching collection: ${col.name}...`);
        const data = await col.model.find({}).lean();
        const destFile = path.join(backupFolder, `${col.name}.json`);
        fs.writeFileSync(destFile, JSON.stringify(data, null, 2));
        console.log(`[Backup Utility] Saved ${data.length} records to ${col.name}.json`);
      }

      await mongoose.disconnect();
      console.log('[Backup Utility] Backup completed successfully.');
    } catch (err) {
      console.error('[Backup Utility] MongoDB extraction failed. Falling back to local JSON database backups.', err.message);
      backupLocalFiles(backupFolder);
    }
  } else {
    console.log('[Backup Utility] MongoDB URL not found. Performing local JSON files backup.');
    backupLocalFiles(backupFolder);
  }
}

function backupLocalFiles(destFolder) {
  const files = [
    { name: 'bookings', file: 'bookings.json' },
    { name: 'users', file: 'users.json' },
    { name: 'sessions', file: 'sessions.json' }
  ];

  for (const item of files) {
    const srcPath = path.join(process.cwd(), item.file);
    if (fs.existsSync(srcPath)) {
      try {
        const destPath = path.join(destFolder, item.file);
        fs.copyFileSync(srcPath, destPath);
        console.log(`[Backup Utility] Successfully copied ${item.file}`);
      } catch (copyErr) {
        console.error(`[Backup Utility] Failed to copy ${item.file}:`, copyErr.message);
      }
    } else {
      console.log(`[Backup Utility] Source file ${item.file} does not exist, skipping.`);
    }
  }
  console.log('[Backup Utility] Local filesystem backup completed.');
}

// Execute the backup operation
runBackup().catch(err => {
  console.error('[Backup Utility] Backup execution crash:', err);
  process.exit(1);
});
