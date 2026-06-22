import axios from "axios";

export const sendSms = async (phone: string, message: string) => {
  if (!process.env.MSG91_API_KEY) {
    console.log(`[DEV SMS] To: ${phone} | ${message}`);
    return;
  }

  // Real MSG91 call — fill in once you have a template ID from their dashboard.
  await axios.post(
    "https://api.msg91.com/api/v5/flow/",
    {
      // template-specific payload goes here
    },
    { headers: { authkey: process.env.MSG91_API_KEY } },
  );
};