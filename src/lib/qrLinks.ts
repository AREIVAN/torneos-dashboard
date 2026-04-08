const ROBOT_QR_CANONICAL_ORIGIN = "https://apex-robotics-qr.netlify.app";

export function buildCanonicalRobotQrLink(robotCode: string): string {
  const normalizedCode = robotCode.trim();
  return `${ROBOT_QR_CANONICAL_ORIGIN}/robots/${encodeURIComponent(normalizedCode)}`;
}
