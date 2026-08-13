const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const os = require('os');

// Load environment variables from .env file if present
require('dotenv').config();

// Configuration
const THRESHOLD_PERCENTAGE = parseInt(process.env.THRESHOLD_PERCENTAGE || '90', 10);
const POLLING_INTERVAL_MINUTES = parseInt(process.env.POLLING_INTERVAL_MINUTES || '5', 10);
const TARGET_MOUNT_POINT = process.env.TARGET_MOUNT_POINT || '/';
const SERVER_NAME = process.env.SERVER_NAME || os.hostname();

// Dry run mode flag (via CLI flag --dry-run / -d or env var DRY_RUN=true)
const IS_DRY_RUN = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run') || process.argv.includes('-d');

// Mailgun config
const MG_API_KEY = process.env.MAILGUN_API_KEY;
const MG_DOMAIN = process.env.MAILGUN_DOMAIN;
const TO_EMAIL = process.env.TO_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL || `ducheck@${MG_DOMAIN}`;

// Initialize Mailgun client if credentials are provided
let mg;
if (MG_API_KEY && MG_DOMAIN) {
  const mailgun = new Mailgun(formData);
  mg = mailgun.client({ username: 'api', key: MG_API_KEY });
}

// State to track if an alert was already sent for the current high disk space event
let alertSentFlag = false;

async function checkDiskSpace() {
  try {
    // df -P outputs in POSIX format which is easier to parse reliably across different systems
    const { stdout } = await execPromise(`df -P ${TARGET_MOUNT_POINT}`);
    const lines = stdout.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('Unexpected df output format');
    }

    const dataLine = lines[1];
    
    // Split by whitespace
    const parts = dataLine.trim().split(/\s+/);
    
    // The capacity (use percentage) is typically the 5th column (index 4)
    // Format: Filesystem (0), 1024-blocks (1), Used (2), Available (3), Capacity (4), Mounted on (5)
    let capacityStr = parts[4];
    
    // Find the column with '%' just to be safe
    if (!capacityStr.includes('%')) {
      const p = parts.find(p => p.includes('%'));
      if (p) capacityStr = p;
    }

    const usePercent = parseInt(capacityStr.replace('%', ''), 10);

    console.log(`[${new Date().toISOString()}] Server [${SERVER_NAME}] - Disk usage for ${TARGET_MOUNT_POINT}: ${usePercent}%. Threshold: ${THRESHOLD_PERCENTAGE}%.`);

    if (usePercent >= THRESHOLD_PERCENTAGE) {
      if (!alertSentFlag) {
        await sendAlertEmail(usePercent);
        alertSentFlag = true;
      }
    } else {
      // Disk space is below threshold, reset the alert flag so we can alert if it goes back up later
      if (alertSentFlag) {
        console.log(`[${new Date().toISOString()}] Server [${SERVER_NAME}] - Disk usage dropped below threshold. Alert reset.`);
      }
      alertSentFlag = false;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Server [${SERVER_NAME}] - Error checking disk space:`, error);
  }
}

async function sendAlertEmail(usePercent) {
  const subject = `🚨 CRITICAL: Disk Space Alert on ${SERVER_NAME} (${usePercent}%)`;
  const text = `Warning: The disk space on server '${SERVER_NAME}' (mount point '${TARGET_MOUNT_POINT}') has exceeded the configured threshold of ${THRESHOLD_PERCENTAGE}%.\n\nCurrent usage is at ${usePercent}%.\n\nPlease take immediate action to free up space.`;

  if (IS_DRY_RUN) {
    console.log(`[${new Date().toISOString()}] 🧪 [DRY RUN] High disk usage detected (${usePercent}% >= ${THRESHOLD_PERCENTAGE}%).`);
    console.log(`[${new Date().toISOString()}] 🧪 [DRY RUN] Would send email alert:`);
    console.log(`  To: ${TO_EMAIL || 'NOT CONFIGURED'}`);
    console.log(`  From: ${FROM_EMAIL}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${text}`);
    return;
  }

  if (!mg || !TO_EMAIL) {
    console.error(`[${new Date().toISOString()}] ALERT: Disk space is at ${usePercent}%, but Mailgun is not fully configured (missing API key, domain, or TO_EMAIL). Cannot send email.`);
    return;
  }

  try {
    await mg.messages.create(MG_DOMAIN, {
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject: subject,
      text: text,
    });
    console.log(`[${new Date().toISOString()}] Alert email sent to ${TO_EMAIL}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending alert email:`, error);
  }
}

function start() {
  if (IS_DRY_RUN) {
    console.log('🧪 DRY RUN MODE ENABLED: No email alerts will actually be sent.');
  } else if (!MG_API_KEY || !MG_DOMAIN || !TO_EMAIL) {
    console.warn('⚠️ WARNING: Mailgun configuration is missing from environment variables.');
    console.warn('Logging will work locally, but email alerts will not be sent.');
  }

  console.log(`=== Starting Disk Space Monitor ===`);
  console.log(`Server Name: ${SERVER_NAME}`);
  console.log(`Target Mount Point: ${TARGET_MOUNT_POINT}`);
  console.log(`Threshold: ${THRESHOLD_PERCENTAGE}%`);
  console.log(`Polling Interval: ${POLLING_INTERVAL_MINUTES} minutes`);
  console.log(`Alert Email To: ${TO_EMAIL || 'NOT CONFIGURED'}`);
  console.log(`Dry Run Mode: ${IS_DRY_RUN ? 'YES' : 'NO'}`);
  console.log(`===================================`);

  // Initial check right away
  checkDiskSpace();

  // Set interval for subsequent polling
  setInterval(checkDiskSpace, POLLING_INTERVAL_MINUTES * 60 * 1000);
}

start();

