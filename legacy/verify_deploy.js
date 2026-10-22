async function verify() {
  const res = await fetch('https://wtokens.vercel.app/app.js');
  const text = await res.text();
  console.log('App.js status:', res.status);
  console.log('Has pullEpicAccountFromCode:', text.includes('pullEpicAccountFromCode'));

  const resHtml = await fetch('https://wtokens.vercel.app/');
  const html = await resHtml.text();
  console.log('Index.html status:', resHtml.status);
  console.log('Has btnPullEpicDirect:', html.includes('id="btnPullEpicDirect"'));
  console.log('Has btnPullEpicModal:', html.includes('id="btnPullEpicModal"'));
  console.log('Has epic redirect link:', html.includes('epicgames.com/id/api/redirect'));
}
verify();
