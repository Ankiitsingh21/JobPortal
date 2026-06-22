import { sendEmail } from "./services/email.service";
import { sendSms } from "./services/sms.service";

 export const handle = async (subject: string, data: any) => {
  switch (subject) {
    case "auth.otp.requested":
      await sendSms(data.phone, `Your SCN Jobs OTP is ${data.otp}. Valid for 5 minutes.`);
      break;

    case "auth.worker.registered":
      await sendEmail(data.email, "Welcome to SCN Jobs", "Your account has been created successfully.");
      break;

    case "auth.recruiter.created":
      await sendEmail(
        data.email,
        "Your SCN Jobs recruiter account",
        `Email: ${data.email}\nTemporary password: ${data.tempPassword}`,
      );
      break;

    case "job.status.changed":
      if (data.status === "active") {
        // TODO: once worker matching by industry/location is needed,
        // query Worker Service here for matching profiles and batch-email them.
        console.log(`[Notification] Job ${data.jobId} is now active — batch email pending`);
      }
      break;

    case "application.status.changed":
      console.log(`[Notification] Application ${data.applicationId} status -> ${data.toStatus}`);
      // TODO: fetch worker's email (Auth Service has it, Worker doesn't store it)
      // before this can send a real email — needs one more internal lookup.
      break;

    default:
      console.warn("Unhandled subject:", subject);
  }
};

// export default handle;