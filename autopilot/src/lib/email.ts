import { Resend } from "resend";
import { getServerEnv } from "@/lib/env";

function getResendClient() {
  const { RESEND_API_KEY } = getServerEnv();
  return new Resend(RESEND_API_KEY);
}

export async function sendPRCreatedEmail(to: string, prLink: string) {
  const resend = getResendClient();
  const { RESEND_FROM_EMAIL } = getServerEnv();

  await resend.emails.send({
    from: RESEND_FROM_EMAIL,
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
