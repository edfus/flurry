const host = config.testMode ? `//${location.host}/` : `https://flurry.ml/`;
// type: "audio/mpeg",
const themes = [
  {
    name: "Intro",
    url: `${host}resource/audio/Loner%20Soundtrack/0_Intro.mp3`,
    role: 'intro'
  },
  {
    name: "C418 - Moog City 2",
    url: `${host}resource/audio/C418%20-%20Moog%20City%202.mp3`,
    role: 'outro'
  }
]; // 无index属性
themes.forEach(e => e.reserve = true);
const songs = [
  {
    name: "Voices",
    url: `${host}resource/audio/Loner%20Soundtrack/1_Voices.mp3`,
    index: 0
  },
  {
    name: "Void",
    url: `${host}resource/audio/Loner%20Soundtrack/2_Void.mp3`,
    index: 1
  },
  {
    name: "Rain",
    url: `${host}resource/audio/Loner%20Soundtrack/3_Rain.mp3`,
    index: 2
  },
  {
    name: "Tunnel",
    url: `${host}resource/audio/Loner%20Soundtrack/4_Tunnel.mp3`,
    index: 3
  },
  {
    name: "Time",
    url: `${host}resource/audio/Loner%20Soundtrack/5_Time.mp3`,
    index: 4
  },
  {
    name: "DeepSea",
    url: `${host}resource/audio/Loner%20Soundtrack/6_DeepSea.mp3`,
    index: 5
  },
  {
    name: "SeaSand",
    url: `${host}resource/audio/Loner%20Soundtrack/7_SeaSand.mp3`,
    index: 6
  },
  {
    name: "Rainyday",
    url: `${host}resource/audio/Loner%20Soundtrack/8_Rainyday.mp3`,
    index: 7
  },
];//.forEach(e => {e.usage = "songs"; e.role = 'none'});

export { themes , songs }