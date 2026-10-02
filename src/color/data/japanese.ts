// Traditional Japanese colors (nippon-iro). [romaji, kanji, hex]
export const WAIRO: [string, string, string][] = [
  ["Sakura", "桜", "#FEDFE1"], ["Momo", "桃", "#F596AA"], ["Kōbai", "紅梅", "#E16B8C"], ["Kurenai", "紅", "#CB1B45"],
  ["Akane", "茜", "#CB4042"], ["Benihi", "紅緋", "#F75C2F"], ["Sango", "珊瑚", "#F17C67"], ["Kaki", "柿", "#ED784A"],
  ["Kuchiba", "朽葉", "#E2943B"], ["Kohaku", "琥珀", "#CA7A2C"], ["Yamabuki", "山吹", "#FFB11B"], ["Kihada", "黄蘗", "#FBE251"],
  ["Uguisu", "鶯", "#6C6A2D"], ["Koke", "苔", "#838A2D"], ["Moegi", "萌黄", "#7BA23F"], ["Nae", "苗", "#86C166"],
  ["Wakatake", "若竹", "#5DAC81"], ["Tokiwa", "常磐", "#1B813E"], ["Rokushō", "緑青", "#24936E"], ["Mizu", "水", "#81C7D4"],
  ["Asagi", "浅葱", "#33A6B8"], ["Hanada", "縹", "#006284"], ["Ruri", "瑠璃", "#005CAF"], ["Ai", "藍", "#0D5661"],
  ["Kon", "紺", "#0F2540"], ["Benikake", "紅掛花", "#4E4F97"], ["Fuji", "藤", "#8B81C3"], ["Shion", "紫苑", "#8F77B5"],
  ["Murasaki", "紫", "#77428D"], ["Ebi", "葡萄", "#6D2E5B"], ["Sumi", "墨", "#1C1C1C"], ["Nezumi", "鼠", "#828282"],
  ["Rikyū", "利休鼠", "#707C74"], ["Ginnezu", "銀鼠", "#91989F"], ["Shironeri", "白練", "#FCFAF2"], ["Gofun", "胡粉", "#FFFFFB"],
  ["Kincha", "金茶", "#C7802D"], ["Kogane", "黄金", "#E9CD4C"], ["Tsuyukusa", "露草", "#2EA9DF"], ["Mizuasagi", "水浅葱", "#66BAB7"],
];

// Gradients composed from those colors. [romaji, kanji, stops]
export const WAGRAD: [string, string, string[]][] = [
  ["Yozakura", "夜桜", ["#0F2540", "#8B81C3", "#FEDFE1"]], ["Asagiri", "朝霧", ["#FCFAF2", "#A5DEE4", "#66BAB7"]],
  ["Yūyake", "夕焼け", ["#4E4F97", "#F75C2F", "#FFB11B"]], ["Hinode", "日の出", ["#0F2540", "#CB1B45", "#FFB11B"]],
  ["Momiji", "紅葉", ["#6D2E5B", "#CB4042", "#E2943B"]], ["Wakaba", "若葉", ["#5DAC81", "#86C166", "#FBE251"]],
  ["Aizome", "藍染", ["#0F2540", "#0D5661", "#33A6B8"]], ["Fujinami", "藤波", ["#77428D", "#8B81C3", "#FEDFE1"]],
  ["Ume", "梅", ["#E16B8C", "#FCFAF2"]], ["Tsuki", "月", ["#0F2540", "#4E4F97", "#E9CD4C"]],
  ["Hotaru", "蛍", ["#0B1013", "#1B813E", "#E9CD4C"]], ["Sumi-e", "墨絵", ["#1C1C1C", "#828282", "#FFFFFB"]],
  ["Kintsugi", "金継ぎ", ["#1C1C1C", "#C7802D", "#E9CD4C"]], ["Kohaku", "琥珀", ["#CA7A2C", "#FFB11B"]],
  ["Shinkai", "深海", ["#08192D", "#005CAF", "#2EA9DF"]], ["Ajisai", "紫陽花", ["#4E4F97", "#8F77B5", "#F596AA"]],
  ["Matcha", "抹茶", ["#6C6A2D", "#838A2D", "#C5C56A"]], ["Sango", "珊瑚", ["#F17C67", "#FEDFE1"]],
  ["Tokiwa", "常磐", ["#1B813E", "#24936E", "#66BAB7"]], ["Yuki", "雪", ["#FFFFFB", "#DAE3EA", "#91989F"]],
  ["Kitsune-bi", "狐火", ["#1C1C1C", "#F75C2F", "#FBE251"]], ["Rikyū", "利休", ["#707C74", "#91989F", "#FCFAF2"]],
  ["Hanabi", "花火", ["#0F2540", "#CB1B45", "#F596AA", "#FBE251"]], ["Ruri-iro", "瑠璃色", ["#0F2540", "#005CAF", "#81C7D4"]],
  ["Sakura-fubuki", "桜吹雪", ["#FFFFFB", "#FEDFE1", "#F596AA"]], ["Kōyō", "紅葉狩", ["#E2943B", "#CB4042", "#77428D"]],
  ["Natsuzora", "夏空", ["#2EA9DF", "#81C7D4", "#FFFFFB"]], ["Kurenai-zome", "紅染", ["#6D2E5B", "#CB1B45", "#F17C67"]],
];

// Classic hues for the top row; traditional colors are sorted into these same columns.
export const CLASSIC: [string, string][] = [
  ["Red", "#EF4444"], ["Orange", "#F97316"], ["Yellow", "#EAB308"], ["Green", "#22C55E"], ["Cyan", "#06B6D4"],
  ["Blue", "#3B82F6"], ["Violet", "#8B5CF6"], ["Pink", "#EC4899"], ["Rose", "#F43F5E"],
];
