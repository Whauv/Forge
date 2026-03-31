import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const senderEmail = process.env.RESEND_FROM_EMAIL ?? "AutoPilot <onboarding@resend.dev>";

function getResendClient() {
  if (!resendApiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  return new Resend(resendApiKey);
}

export async function sendPRCreatedEmail(to: string, prLink: string) {
  const resend = getResendClient();

  await resend.emails.send({
    from: senderEmail,
    to,
    subject: "AutoPilot created a pull request",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Pull request ready</h2>
        <p>AutoPilot created a pull request for your project.</p>
        <p>
          Review it here:
          <a href="${prLink}" target="_blank" rel="noopener noreferrer">${prLink}</a>
        </p>
      </div>
    `,
  });
}
