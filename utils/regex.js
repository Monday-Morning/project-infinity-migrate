export const gmailRegex = new RegExp(
  /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@gmail(\.([^<>()[\]\.,;:\s@\"]{2,})){1,}$/i
);
export const nitrMailRegex = new RegExp(
  /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@nitrkl\.ac\.in$/i
);

export function testGmail(gmailId) {
  return gmailRegex.test(gmailId);
}

export function testNitrMail(nitrMail) {
  return nitrMail.test(nitrMail);
}
