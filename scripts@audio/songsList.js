const host = config.testMode ? `http://${location.host}/` : `https://flurry.ml/`;
// type: "audio/mpeg",
const themes = [
  {
    name: "Intro",
    author: "Inner Peace Studio",
    url: `${host}resource/audio/Loner%20Soundtrack/0_Intro.mp3`,
    role: 'intro'
  },
  {
    name: "Moog City 2",
    author: "C418",
    url: `${host}resource/audio/C418%20-%20Moog%20City%202_cutted.mp3`,
    role: 'outro'
  }
]; // 无index属性
themes.forEach(e => e.reserve = true);
const songs = [
  // {
  //   name: "Voices",
  //   url: `${host}resource/audio/Loner%20Soundtrack/1_Voices.mp3`,
  //   index: 0
  // },
  {
    name: "Void",
    url: `${host}resource/audio/Loner%20Soundtrack/2_Void.mp3`
  },
  {
    name: "Rain",
    url: `${host}resource/audio/Loner%20Soundtrack/3_Rain.mp3`
  },
  {
    name: "Tunnel",
    url: `${host}resource/audio/Loner%20Soundtrack/4_Tunnel.mp3`
  },
  {
    name: "Time",
    url: `${host}resource/audio/Loner%20Soundtrack/5_Time.mp3`
  },
  {
    name: "DeepSea",
    url: `${host}resource/audio/Loner%20Soundtrack/6_DeepSea.mp3`
  },
  {
    name: "SeaSand",
    url: `${host}resource/audio/Loner%20Soundtrack/7_SeaSand.mp3`
  },
  {
    name: "Rainyday",
    url: `${host}resource/audio/Loner%20Soundtrack/8_Rainyday.mp3`
  },
];
songs.forEach((e, i) => {e.index = i; e.author = "Inner Peace Studio"});

export { themes , songs }