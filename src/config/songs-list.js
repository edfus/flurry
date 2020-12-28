/**
 * We are using worker to fetch song assets, 
 * so instead of relative uris, absolute urls must be used.
 */

const host = config.testMode ? `http://${location.host}/` : `https://${location.host}/`;
//NOTE: host needs to be configured

const themes = [
  {
    name: "Intro",
    author: "Inner Peace Studio",
    url: `${host}asset/audio/Loner%20Soundtrack/0_Intro.mp3`,
    role: 'intro'
  },
  {
    name: "Moog City 2",
    author: "C418",
    url: `${host}asset/audio/C418%20-%20Moog%20City%202_cutted.mp3`,
    role: 'outro'
  }
]; // the index property can be omitted for themes.

/**
 * themes are always reserved 
 * (always got their arrayBuffer stored in memory)
 * for we can't predict when will they be called
 */

themes.forEach(e => e.reserve = true); 

const songs = [
  {
    name: "Void",
    url: `${host}asset/audio/Loner%20Soundtrack/2_Void.mp3`
  },
  {
    name: "Tunnel",
    url: `${host}asset/audio/Loner%20Soundtrack/4_Tunnel.mp3`
  },
  {
    name: "DeepSea",
    url: `${host}asset/audio/Loner%20Soundtrack/6_DeepSea.mp3`
  },
  {
    name: "Rain",
    url: `${host}asset/audio/Loner%20Soundtrack/3_Rain.mp3`
  },
  {
    name: "Time",
    url: `${host}asset/audio/Loner%20Soundtrack/5_Time.mp3`
  },
  {
    name: "Voices",
    url: `${host}asset/audio/Loner%20Soundtrack/1_Voices.mp3`
  },
  {
    name: "SeaSand",
    url: `${host}asset/audio/Loner%20Soundtrack/7_SeaSand.mp3`
  },
  {
    name: "Rainyday",
    url: `${host}asset/audio/Loner%20Soundtrack/8_Rainyday.mp3`
  },
];

songs.forEach((e, i) => {e.index = i; e.author = "Inner Peace Studio"});

export { themes , songs };