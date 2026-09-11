#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vocab = Object.fromEntries([1, 2, 3].map((level) => [level, JSON.parse(fs.readFileSync(path.join(root, "data", `hsk${level}.json`), "utf8"))]));
const allWords = Object.values(vocab).flat();
const byHanzi = new Map(allWords.map((word) => [word.hanzi.replace(/[（）].*?[）]/g, ""), word]));
const levelByHanzi = new Map([1, 2, 3].flatMap((level) => vocab[level].map((word) => [word.hanzi.replace(/[（）].*?[）]/g, ""), level])));
const levelChars = Object.fromEntries([1, 2, 3].map((level) => [level, new Set([1, 2, 3].filter((item) => item <= level).flatMap((item) => vocab[item].flatMap((word) => [...word.hanzi])))]));

const SCENES = {
  1: [
    ["☕", "他在喝茶。", "Tā zài hē chá.", "お茶を飲む人"], ["🚕", "她坐出租车去学校。", "Tā zuò chūzūchē qù xuéxiào.", "タクシーで学校へ行く人"],
    ["📖", "他在看书。", "Tā zài kàn shū.", "本を読む人"], ["📱", "妈妈在打电话。", "Māma zài dǎ diànhuà.", "電話をする人"],
    ["🐈", "小猫在桌子上。", "Xiǎomāo zài zhuōzi shàng.", "机の上の猫"], ["🍚", "我中午吃米饭。", "Wǒ zhōngwǔ chī mǐfàn.", "ご飯を食べる人"],
    ["🏫", "学生去学校。", "Xuésheng qù xuéxiào.", "学校へ行く学生"], ["🌧️", "今天下雨了。", "Jīntiān xiàyǔ le.", "雨の日"],
    ["✈️", "爸爸坐飞机来北京。", "Bàba zuò fēijī lái Běijīng.", "飛行機で北京へ来る人"], ["📺", "她在家看电视。", "Tā zài jiā kàn diànshì.", "家でテレビを見る人"],
    ["🍎", "桌子上有三个苹果。", "Zhuōzi shàng yǒu sān ge píngguǒ.", "机の上の三つのリンゴ"], ["🧑‍⚕️", "王先生是医生。", "Wáng xiānsheng shì yīshēng.", "医師"],
    ["🍜", "我们在饭馆吃饭。", "Wǒmen zài fànguǎn chīfàn.", "食堂で食事する人々"], ["😴", "女儿在睡觉。", "Nǚ'ér zài shuìjiào.", "眠っている女の子"],
    ["✍️", "老师在写汉字。", "Lǎoshī zài xiě Hànzì.", "漢字を書く先生"],
    // ここから下は読解用（聴解で聞いた文を読解で再利用しないため）
    ["🚗", "我爸爸会开车。", "Wǒ bàba huì kāichē.", "車を運転できる父"], ["🏥", "妈妈在医院工作。", "Māma zài yīyuàn gōngzuò.", "病院で働く母"],
    ["🛍️", "我去商店买东西。", "Wǒ qù shāngdiàn mǎi dōngxi.", "店で買い物する人"], ["💻", "这是我的电脑。", "Zhè shì wǒ de diànnǎo.", "自分のパソコン"],
    ["💧", "我想喝水。", "Wǒ xiǎng hē shuǐ.", "水を飲みたい人"], ["👧", "这是我的女儿。", "Zhè shì wǒ de nǚ'ér.", "娘"],
    ["🐕", "这是我的狗。", "Zhè shì wǒ de gǒu.", "飼い犬"], ["🧑‍🏫", "他是我的老师。", "Tā shì wǒ de lǎoshī.", "先生"],
    ["🕐", "现在是一点。", "Xiànzài shì yì diǎn.", "1時の時計"], ["📅", "明天是星期六。", "Míngtiān shì xīngqīliù.", "土曜日のカレンダー"],
  ],
  2: [
    ["🏀", "弟弟正在打篮球。", "Dìdi zhèngzài dǎ lánqiú.", "バスケットボールをする人"], ["🏃", "哥哥每天早上跑步。", "Gēge měitiān zǎoshang pǎobù.", "朝に走る人"],
    ["🏊", "她最喜欢游泳。", "Tā zuì xǐhuan yóuyǒng.", "泳ぐ人"], ["🚌", "我坐公共汽车去公司。", "Wǒ zuò gōnggòng qìchē qù gōngsī.", "バスで会社へ行く人"],
    ["🚲", "他骑自行车上班。", "Tā qí zìxíngchē shàngbān.", "自転車で通勤する人"], ["❄️", "外面下雪了。", "Wàimiàn xiàxuě le.", "雪の日"],
    ["👗", "姐姐穿着红色的衣服。", "Jiějie chuānzhe hóngsè de yīfu.", "赤い服を着た人"], ["🎂", "今天是孩子的生日。", "Jīntiān shì háizi de shēngrì.", "誕生日の子ども"],
    ["📰", "爸爸在看报纸。", "Bàba zài kàn bàozhǐ.", "新聞を読む人"], ["⌚", "这块手表很贵。", "Zhè kuài shǒubiǎo hěn guì.", "高価な腕時計"],
    ["🥚", "我买了两公斤鸡蛋。", "Wǒ mǎi le liǎng gōngjīn jīdàn.", "卵を買う人"], ["💊", "她生病了，要吃药。", "Tā shēngbìng le, yào chī yào.", "薬を飲む病人"],
    ["🎤", "妹妹在唱歌。", "Mèimei zài chànggē.", "歌う人"], ["⚽", "他们下午踢足球。", "Tāmen xiàwǔ tī zúqiú.", "サッカーをする人々"],
    ["🎫", "我在机场买票。", "Wǒ zài jīchǎng mǎi piào.", "空港で切符を買う人"], ["🥛", "孩子早上喝牛奶。", "Háizi zǎoshang hē niúnǎi.", "牛乳を飲む子ども"],
    ["💃", "她们晚上一起跳舞。", "Tāmen wǎnshang yìqǐ tiàowǔ.", "一緒に踊る人々"], ["☕", "服务员送来两杯咖啡。", "Fúwùyuán sòng lái liǎng bēi kāfēi.", "コーヒーを運ぶ店員"],
    ["🚪", "请进，门开着呢。", "Qǐng jìn, mén kāizhe ne.", "開いているドア"], ["🧼", "他正在洗衣服。", "Tā zhèngzài xǐ yīfu.", "服を洗う人"],
    // ここから下は読解用（聴解で聞いた文を読解で再利用しないため）
    ["🍉", "我买了一个西瓜。", "Wǒ mǎi le yí ge xīguā.", "スイカを買う人"], ["🏃‍♀️", "她每天晚上运动。", "Tā měitiān wǎnshang yùndòng.", "夜に運動する人"],
    ["🛏️", "弟弟已经睡觉了。", "Dìdi yǐjīng shuìjiào le.", "眠っている弟"], ["🚕", "他坐出租车去机场。", "Tā zuò chūzūchē qù jīchǎng.", "タクシーで空港へ行く人"],
    ["📗", "姐姐在教室里学习。", "Jiějie zài jiàoshì lǐ xuéxí.", "教室で勉強する人"],
  ],
  3: [
    ["🛗", "她坐电梯到五层。", "Tā zuò diàntī dào wǔ céng.", "エレベーターで五階へ行く人"], ["🚇", "我每天坐地铁上班。", "Wǒ měitiān zuò dìtiě shàngbān.", "地下鉄で通勤する人"],
    ["🧹", "他把房间打扫干净了。", "Tā bǎ fángjiān dǎsǎo gānjìng le.", "部屋を掃除する人"], ["🌳", "爷爷在公园锻炼身体。", "Yéye zài gōngyuán duànliàn shēntǐ.", "公園で運動する人"],
    ["🛒", "她去超市买新鲜的葡萄。", "Tā qù chāoshì mǎi xīnxiān de pútao.", "スーパーでブドウを買う人"], ["📚", "学生在图书馆认真复习。", "Xuésheng zài túshūguǎn rènzhēn fùxí.", "図書館で復習する学生"],
    ["👥", "经理正在办公室开会。", "Jīnglǐ zhèngzài bàngōngshì kāihuì.", "事務室で会議する人々"], ["🛂", "旅行以前别忘了带护照。", "Lǚxíng yǐqián bié wàng le dài hùzhào.", "パスポートを持つ旅行者"],
    ["📦", "他们正在搬家。", "Tāmen zhèngzài bānjiā.", "引っ越しをする人々"], ["⛰️", "周末我们打算去爬山。", "Zhōumò wǒmen dǎsuàn qù páshān.", "週末に山へ登る人々"],
  ],
};

const DIALOGUES = {
  1: [
    ["男：你喝茶吗？女：不，我喝水。问：女的喝什么？", "女的喝什么？", "水", ["茶", "米饭"]],
    ["女：现在几点？男：三点。问：现在几点？", "现在几点？", "三点", ["两点", "四点"]],
    ["男：你去哪儿？女：我去学校。问：女的去哪儿？", "女的去哪儿？", "学校", ["医院", "商店"]],
    ["女：这是谁的猫？男：是小王的。问：猫是谁的？", "猫是谁的？", "小王的", ["小李的", "老师的"]],
    ["男：你会做饭吗？女：不会。问：女的会做饭吗？", "女的会做饭吗？", "不会", ["会", "不是"]],
  ],
  2: [
    ["男：今天冷吗？女：不冷，但是下雨了。问：今天天气怎么样？", "今天天气怎么样？", "下雨", ["晴", "雪"]],
    ["女：你怎么还没吃饭？男：我今天工作太忙了。问：男的为什么没吃饭？", "男的为什么没吃饭？", "工作忙", ["不饿", "等朋友"]],
    ["男：这件红色衣服怎么样？女：颜色不错，但是太大了。问：女的觉得衣服怎么样？", "女的觉得衣服怎么样？", "太大", ["太小", "太贵"]],
    ["女：明天一起去跑步吧。男：好，早上七点见。问：他们明天做什么？", "他们明天做什么？", "跑步", ["游泳", "打篮球"]],
    ["男：去机场坐出租车要多久？女：大概四十分钟。问：去机场要多长时间？", "去机场要多长时间？", "四十分钟", ["十四分钟", "一个小时"]],
    ["女：你为什么不坐公共汽车？男：我家离公司很近，走路就到了。问：男的怎么去公司？", "男的怎么去公司？", "走路", ["坐汽车", "骑自行车"]],
    ["男：你妹妹多大？女：她今年十二岁。问：妹妹几岁？", "妹妹几岁？", "十二岁", ["二十岁", "十岁"]],
    ["女：这条裤子一百元，那条呢？男：那条便宜二十元。问：那条裤子多少钱？", "那条裤子多少钱？", "八十元", ["一百元", "一百二十元"]],
    ["男：你最喜欢什么运动？女：冬天打篮球，夏天游泳。问：女的夏天喜欢什么？", "女的夏天喜欢什么？", "游泳", ["打篮球", "跑步"]],
    ["女：你身体不舒服吗？男：我生病了，想休息。问：男的怎么了？", "男的怎么了？", "生病", ["很累", "很饿"]],
    ["男：电影几点开始？女：晚上八点，现在七点半。问：电影还有多久开始？", "电影还有多久开始？", "半小时", ["一小时", "两小时"]],
    ["女：你买了什么水果？男：我买了苹果，没买西瓜。问：男的没买什么？", "男的没买什么？", "西瓜", ["苹果", "水果"]],
    ["男：考试准备好了吗？女：还没有，我正在准备。问：女的正在做什么？", "女的正在做什么？", "准备", ["考试", "休息"]],
    ["女：你哥哥在哪儿工作？男：他是医生，在北京医院工作。问：哥哥在哪儿工作？", "哥哥在哪儿工作？", "医院", ["学校", "公司"]],
    ["男：今天是你的生日，这本书送给你。女：谢谢，我很喜欢。问：男的送了什么？", "男的送了什么？", "书", ["手表", "手机"]],
  ],
  3: [
    ["女：你的自行车找到了吗？男：找到了，朋友说明天下午给我送来。问：自行车什么时候送来？", "自行车什么时候送来？", "明天下午", ["今天下午", "明天上午"]],
    ["男：你怎么不坐电梯？女：我住三楼，走楼梯还能锻炼身体。问：女的为什么走楼梯？", "女的为什么走楼梯？", "锻炼身体", ["电梯坏了", "住一楼"]],
    ["女：这家饭店的菜怎么样？男：味道不错，就是服务有点儿慢。问：男的对什么不满意？", "男的对什么不满意？", "服务", ["味道", "环境"]],
    ["男：听说你要搬家？女：对，新家离公司更近。问：女的为什么搬家？", "女的为什么搬家？", "离公司近", ["房子太小", "换了公司"]],
    ["女：作业做完了吗？男：内容完成了，还要检查一下。问：男的接下来要做什么？", "男的接下来要做什么？", "检查作业", ["开始写", "去上课"]],
    ["男：会议已经开始了吗？女：还没有，经理十分钟以后才来。问：经理什么时候来？", "经理什么时候来？", "十分钟以后", ["十分钟以前", "马上"]],
    ["女：你的感冒好点儿了吗？男：好多了，但是医生让我再休息两天。问：医生让男的做什么？", "医生让男的做什么？", "休息", ["上班", "锻炼"]],
    ["男：周末去爬山怎么样？女：外面下雨了，我们还是去看电影吧。问：他们决定做什么？", "他们决定做什么？", "看电影", ["去爬山", "去公园"]],
    ["女：请问，洗手间在哪儿？男：一直往前走，在电梯的右边。问：洗手间在哪儿？", "洗手间在哪儿？", "电梯右边", ["电梯左边", "办公室旁边"]],
    ["男：你觉得这次比赛怎么样？女：虽然没得第一，但是大家都很努力。问：女的怎么看这次比赛？", "女的怎么看这次比赛？", "大家很努力", ["比赛太容易", "成绩最好"]],
    ["女：你怎么才到？男：路上突然下大雨，公共汽车也来得很慢。问：男的为什么迟到？", "男的为什么迟到？", "汽车来得慢", ["忘了时间", "起床晚了"]],
    ["男：这件蓝衬衫你穿着正合适。女：可是我更喜欢那件白的。问：女的喜欢哪件？", "女的喜欢哪件？", "白衬衫", ["蓝衬衫", "红裙子"]],
    ["女：听说你找到新工作了？男：是的，下个月去银行上班。问：男的要去哪儿工作？", "男的要去哪儿工作？", "银行", ["学校", "超市"]],
    ["男：你认识新来的同事吗？女：昨天刚见面，她很热情。问：女的觉得新同事怎么样？", "女的觉得新同事怎么样？", "很热情", ["很安静", "很奇怪"]],
    ["女：行李箱怎么这么重？男：里面有很多书，还有给朋友的礼物。问：箱子里主要有什么？", "箱子里主要有什么？", "书和礼物", ["衣服和鞋", "水果和饮料"]],
    ["男：你不是打算坐地铁吗？女：地铁今天有问题，我只好坐出租车。问：女的为什么坐出租车？", "女的为什么坐出租车？", "地铁有问题", ["时间太早", "行李太多"]],
    ["女：这张照片是在北京照的吗？男：不是，是去年去上海旅游时照的。问：照片在哪儿照的？", "照片在哪儿照的？", "上海", ["北京", "家里"]],
    ["男：你的汉语水平提高得真快。女：我每天听新闻，还经常和中国朋友说话。问：女的怎么学习汉语？", "女的怎么学习汉语？", "听新闻说话", ["只做作业", "只看电影"]],
    ["女：冰箱里什么都没有了。男：那我们先去超市，然后回家做饭。问：他们先做什么？", "他们先做什么？", "去超市", ["回家", "去饭馆"]],
    ["男：你为什么一直看地图？女：我在找附近的宾馆，宾馆就在前面。问：女的在找什么？", "女的在找什么？", "宾馆", ["银行", "图书馆"]],
  ],
};

// HSK2聴解は本番1回分の35問とは別に、各部分10回分（計350問）の
// 問題プールを持つ。既存問題を残しつつ、以下のテンプレートから
// 意味の異なる場面・会話を生成し、模試開始時に部分ごとに抽選する。
const HSK2_SCENE_SUBJECTS = ["爸爸", "妈妈", "哥哥", "姐姐", "弟弟", "妹妹", "老师", "学生", "朋友", "服务员"];
const HSK2_SCENE_TIMINGS = ["正在", "早上", "晚上", "每天", "现在", "下午", "今天", "明天要", "很喜欢", "也在"];
const HSK2_SCENE_ACTIONS = [
  ["☕", "喝茶", "お茶を飲む人"], ["📰", "看报纸", "新聞を読む人"], ["🎬", "看电影", "映画を見る人"],
  ["🏀", "打篮球", "バスケットボールをする人"], ["🏃", "跑步", "走る人"], ["🏊", "游泳", "泳ぐ人"],
  ["🎤", "唱歌", "歌う人"], ["💃", "跳舞", "踊る人"], ["🧼", "洗衣服", "服を洗う人"],
  ["🍳", "做饭", "料理をする人"], ["💼", "工作", "働く人"], ["🀄", "学习汉语", "中国語を学ぶ人"],
  ["🚲", "骑自行车", "自転車に乗る人"], ["🚌", "坐公共汽车", "バスに乗る人"], ["🍎", "买苹果", "リンゴを買う人"],
  ["🍚", "吃米饭", "ご飯を食べる人"], ["📱", "打电话", "電話をする人"], ["📖", "看书", "本を読む人"],
];

function buildHsk2ExtraScenes() {
  return HSK2_SCENE_ACTIONS.flatMap(([symbol, action, alt]) => HSK2_SCENE_SUBJECTS.map((subject, index) => [
    symbol,
    `${subject}${HSK2_SCENE_TIMINGS[index]}${action}。`,
    "",
    `${alt}（${subject}）`,
  ]));
}

function rotatingDistractors(items, answer, count = 2) {
  const start = items.indexOf(answer);
  return Array.from({ length: count }, (_, offset) => items[(start + offset + 1) % items.length]).filter((item) => item !== answer);
}

function buildHsk2ShortDialoguePool() {
  const people = ["爸爸", "妈妈", "哥哥", "姐姐", "弟弟", "妹妹", "老师", "同学", "朋友", "丈夫"];
  const times = ["早上", "上午", "中午", "下午", "晚上", "今天", "明天", "每天", "现在", "星期日"];
  const places = ["学校", "医院", "公司", "饭馆", "机场"];
  const result = [];
  const add = (items, build) => people.forEach((person, index) => {
    const answer = items[index % items.length];
    result.push(build({ person, time: times[index], place: places[index % places.length], answer, distractors: rotatingDistractors(items, answer), index }));
  });

  add(["水", "茶", "咖啡", "牛奶"], ({ person, time, answer, distractors, index }) => {
    const other = ["水", "茶", "咖啡", "牛奶"][(index + 1) % 4];
    return [`男：${person}${time}喝${other}吗？女：不，${person}${time}喝${answer}。问：${person}喝什么？`, `${person}喝什么？`, answer, distractors];
  });
  add(["公共汽车", "出租车", "自行车", "走路"], ({ person, place, answer, distractors }) => {
    const action = { 公共汽车: "坐公共汽车", 出租车: "坐出租车", 自行车: "骑自行车", 走路: "走路" }[answer];
    return [`女：${person}怎么去${place}？男：${person}${action}去。问：${person}怎么去？`, `${person}怎么去？`, answer, distractors];
  });
  add(["跑步", "游泳", "打篮球", "踢足球", "跳舞"], ({ person, time, answer, distractors }) =>
    [`男：${person}${time}做什么？女：${person}和朋友一起${answer}。问：${person}做什么？`, `${person}做什么？`, answer, distractors]);
  add(["红色", "白色", "黑色"], ({ person, answer, distractors, index }) =>
    [`女：${person}的新衣服是${answer}的吗？男：是的，是${answer}的。问：${person}的衣服是什么颜色？`, `${person}的衣服是什么颜色？`, answer, [...distractors, ["红色", "白色", "黑色"][(index + 2) % 3]].slice(0, 2)]);
  add(["苹果", "西瓜", "鸡蛋", "羊肉"], ({ person, time, answer, distractors }) =>
    [`男：${person}${time}买了什么？女：${person}买了${answer}。问：${person}买了什么？`, `${person}买了什么？`, answer, distractors]);
  add(["学校", "医院", "公司", "饭馆"], ({ person, answer, distractors }) =>
    [`女：${person}在哪儿工作？男：${person}在${answer}工作。问：${person}在哪儿工作？`, `${person}在哪儿工作？`, answer, distractors]);
  add(["七点", "八点", "九点", "十点", "十一点", "十二点", "一点", "两点", "三点", "四点"], ({ time, answer, distractors, index }) => {
    const event = ["电影", "考试", "汉语课", "工作"][index % 4];
    return [`男：${time}的${event}几点开始？女：${answer}开始。问：${event}几点开始？`, `${event}几点开始？`, answer, distractors];
  });
  add(["左边", "右边", "旁边", "前面", "后面"], ({ person, place, answer, distractors, index }) => {
    const target = ["医院", "公司", "饭馆", "学校", "机场"][index % 5];
    return [`女：${person}，${target}在哪儿？男：在${place}的${answer}。问：${target}在哪儿？`, `${target}在哪儿？`, answer, distractors];
  });
  add(["下雨", "下雪", "晴天", "阴天"], ({ time, answer, distractors }) =>
    [`男：${time}天气怎么样？女：${time}是${answer}。问：${time}天气怎么样？`, `${time}天气怎么样？`, answer, distractors]);
  return result;
}

function buildHsk2LongDialoguePool() {
  const people = ["爸爸", "妈妈", "哥哥", "姐姐", "弟弟", "妹妹", "老师", "同学", "朋友"];
  const times = ["早上", "上午", "中午", "下午", "晚上", "今天", "明天", "星期六", "星期日"];
  const result = [];
  const add = (items, build) => people.forEach((person, index) => {
    const answer = items[index % items.length];
    result.push(build({ person, time: times[index], answer, distractors: rotatingDistractors(items, answer), index }));
  });

  add(["红色", "白色", "黑色"], ({ person, answer, distractors, index }) => {
    const other = ["红色", "白色", "黑色"][(index + 1) % 3];
    return [`女：${person}想买一件新衣服。男：${other}的一百元，${answer}的八十元。女：${person}喜欢${answer}的。问：${person}喜欢什么颜色的衣服？`, `${person}喜欢什么颜色的衣服？`, answer, distractors];
  });
  add(["七点", "八点", "九点", "十点", "十一点", "十二点", "一点", "两点", "三点"], ({ answer, distractors, index }) => {
    const event = ["电影", "考试", "汉语课"][index % 3];
    return [`男：${event}${answer}开始。女：现在还早，我们等一会儿吧。男：好，我们一起进去。问：${event}几点开始？`, `${event}几点开始？`, answer, distractors];
  });
  add(["公共汽车", "出租车", "自行车", "走路"], ({ person, time, answer, distractors }) => {
    const action = { 公共汽车: "坐公共汽车", 出租车: "坐出租车", 自行车: "骑自行车", 走路: "走路" }[answer];
    return [`女：${person}${time}要去公司吗？男：是的，公司离家不远。女：那${person}怎么去？男：${person}${action}去。问：${person}怎么去公司？`, `${person}怎么去公司？`, answer, distractors];
  });
  add(["休息", "吃药", "睡觉", "去医院"], ({ person, time, answer, distractors }) =>
    [`男：${person}${time}怎么没来？女：${person}生病了，身体不舒服。男：那${person}要${answer}。问：${person}要做什么？`, `${person}要做什么？`, answer, distractors]);
  add(["书", "手表", "手机", "衣服"], ({ person, time, answer, distractors }) => {
    const gift = { 书: "一本书", 手表: "一块手表", 手机: "一个手机", 衣服: "一件衣服" }[answer];
    return [`女：${time}是${person}的生日。男：你准备送什么？女：${person}喜欢${answer}，我要买${gift}送给${person}。问：女的要送什么？`, "女的要送什么？", answer, distractors];
  });
  return result;
}

// 聴解第4部分は本番では4〜5往復の長い対話。[音声原文, 設問, 正解, [誤答2つ]]
const HSK3_LONG_DIALOGUES = [
  ["男：你的行李箱怎么这么重？女：里面有很多书，还有给朋友的礼物。男：需要我帮你拿吗？女：谢谢，你帮我拿这个包就行。问：女的让男的拿什么？",
    "女的让男的拿什么？", "包", ["行李箱", "礼物"]],
  ["女：你怎么还在办公室？男：我要检查一下这个月的成绩。女：需要我帮忙吗？男：不用，我马上就完成了。问：男的在做什么？",
    "男的在做什么？", "检查成绩", ["开会", "打扫办公室"]],
  ["男：听说你搬家了？女：对，上个星期刚搬完。男：新房子怎么样？女：环境很安静，就是离地铁站有点儿远。问：女的觉得新房子怎么样？",
    "女的觉得新房子怎么样？", "安静但是远", ["又近又便宜", "有点儿小"]],
  ["女：明天的会议几点开始？男：以前是上午九点，经理昨天换成了下午两点。女：为什么换了？男：因为几个同事上午到不了。问：会议明天什么时候开始？",
    "会议明天什么时候开始？", "下午两点", ["上午九点", "明天晚上"]],
  ["男：你的感冒好点儿了吗？女：还是有点儿疼，医生让我多休息。男：那你今天别去上班了。女：我已经告诉经理了。问：女的今天为什么不上班？",
    "女的今天为什么不上班？", "因为生病", ["因为搬家", "因为下雨"]],
  ["女：周末打算做什么？男：我想去爬山，可是听说要下雨。女：那我们下次再去吧。男：好，这个周末先去看电影。问：他们这个周末做什么？",
    "他们这个周末做什么？", "看电影", ["去爬山", "在家休息"]],
  ["男：这条裤子多少钱？女：一百五十元，比上个月便宜了五十。男：那我要一条蓝色的。女：好的，一共一百五十元。问：男的花了多少钱？",
    "男的花了多少钱？", "一百五十元", ["二百元", "五十元"]],
  ["男：这家饭馆的菜真不错。女：是啊，就是服务有点儿慢。男：下次我们早点儿来。女：好，下次先打电话。问：他们觉得这家饭馆怎么样？",
    "他们觉得这家饭馆怎么样？", "菜好服务慢", ["又贵又不好吃", "环境不干净"]],
  ["女：你今天怎么走着来的？男：我的自行车昨天坏了。女：那你明天怎么上班？男：我打算坐地铁。问：男的明天怎么上班？",
    "男的明天怎么上班？", "坐地铁", ["骑自行车", "走路"]],
  ["男：这张照片是在哪儿照的？女：去年在上海，我跟同事一起去的。男：你们玩了几天？女：一共五天，还爬了山。问：女的去上海做什么？",
    "女的去上海做什么？", "旅游", ["上班", "看病"]],
];

// 読解第3部分は本番では短文＋設問。聴解と同じ素材は使わない。[短文, 設問, 正解, [誤答2つ]]
const HSK3_PASSAGES = [
  ["我家附近新开了一家超市，里面的水果又新鲜又便宜。虽然离我家有点儿远，但是我每个周末都会去一次。",
    "他为什么常去那家超市？", "水果新鲜便宜", ["离家很近", "那儿人很少"]],
  ["小李昨天参加了学校的比赛，虽然没得第一，但是他觉得很高兴，因为他认识了很多新朋友。",
    "小李为什么高兴？", "认识了新朋友", ["得了第一", "比赛很简单"]],
  ["明天的会议非常重要，经理让大家八点以前到办公室。如果有事不能参加，一定要提前告诉他。",
    "不能参加会议的人要做什么？", "提前告诉经理", ["直接不去", "下午再来"]],
  ["这个城市的地铁很方便，从我家到公司只要二十分钟。以前我开车上班，经常遇到问题，现在方便多了。",
    "他现在怎么上班？", "坐地铁", ["开车", "骑自行车"]],
  ["我妹妹很喜欢动物，她家里有一只猫。她每天下午放学以后，都要先跟猫玩一会儿，然后才做作业。",
    "妹妹放学以后先做什么？", "跟猫玩", ["做作业", "看电视"]],
  ["听说这家宾馆的房间很干净，环境也很安静，就是有点儿贵。我们打算先住三天，然后去别的城市。",
    "他们觉得这家宾馆怎么样？", "干净但是贵", ["又便宜又干净", "很不方便"]],
  ["张老师上课很认真，他总是先讲重要的地方，然后让我们自己练习。所以同学们都很喜欢他的课。",
    "同学们为什么喜欢张老师的课？", "他讲得认真", ["他的课很短", "他常常唱歌"]],
  ["昨天我坐出租车去机场，因为路上突然下大雨，车开得很慢，差点儿就迟到了。",
    "他昨天为什么差点儿迟到？", "因为下大雨", ["因为起床晚了", "因为坐错了车"]],
  ["爷爷今年七十岁了，但是身体很健康。他每天早上都去公园锻炼一个小时，然后回家吃早饭。",
    "爷爷早上做什么？", "在公园锻炼", ["在家看报纸", "去超市买东西"]],
  ["我打算下个月去北京旅游，已经买好了飞机票。听说那儿秋天的天气最舒服，所以很多人都选择这个季节去。",
    "他为什么选择下个月去北京？", "天气舒服", ["票很便宜", "朋友在那儿"]],
];

// 書写はHSK3の文法・漢字で出題する。
const HSK3_REORDER = [
  [["他", "把", "房间", "打扫", "干净了"], "他把房间打扫干净了。"],
  [["这里", "的", "环境", "越来越", "好了"], "这里的环境越来越好了。"],
  [["她", "一边", "听音乐", "一边", "做作业"], "她一边听音乐一边做作业。"],
  [["我", "的", "自行车", "被", "朋友", "骑走了"], "我的自行车被朋友骑走了。"],
  [["这个", "问题", "比", "那个", "容易"], "这个问题比那个容易。"],
];

const HSK3_INPUT = [
  ["我的腿有点儿（téng）。", "疼"], ["她穿了一条（lán）色的裙子。", "蓝"], ["外面下雨了，别忘了带（sǎn）。", "伞"],
  ["妹妹的（liǎn）红了。", "脸"], ["天黑了，请把（dēng）打开。", "灯"],
];

const HSK3_STATEMENTS = [
  ["小李最近每天都锻炼，所以身体比以前好多了。", "小李的身体有了变化。", true],
  ["外面虽然刮风，但是太阳很好，我们还是决定去公园。", "因为天气不好，他们不去公园了。", false],
  ["王老师把会议时间从上午十点换到了下午两点。", "会议下午两点举行。", true],
  ["我以为护照在行李箱里，后来在桌子下面找到了。", "护照最后在行李箱里找到了。", false],
  ["这家宾馆离地铁站很近，房间也很干净，就是有点儿贵。", "这家宾馆很方便。", true],
  ["妹妹发烧了，医生说她这两天必须在家休息。", "妹妹应该去上班。", false],
  ["张经理对这次表演很满意，还表示以后愿意继续帮忙。", "张经理喜欢这次表演。", true],
  ["我先去银行办事，然后到超市买东西，最后才回家。", "我回家以前去了两个地方。", true],
  ["他普通话说得不错，但是写汉字还比较慢。", "他不会说普通话。", false],
  ["我们本来打算爬山，因为突然下雨，只好改去饭馆吃饭。", "他们最后没有去爬山。", true],
];

// 判断对错（本番形式）。本文を読み、★の文が本文と合っているかを判断する。
// [本文, 本文ピンイン, ★の文, ★のピンイン, 正解(true=对), 解説]
const HSK2_JUDGE = [
  ["我家离公司很近，走路十分钟就到。", "Wǒ jiā lí gōngsī hěn jìn, zǒulù shí fēnzhōng jiù dào.",
    "我每天坐公共汽车上班。", "Wǒ měitiān zuò gōnggòng qìchē shàngbān.", false,
    "本文は「歩いて10分で着く」なので、バスで通勤している★とは合いません。"],
  ["昨天是我妻子的生日，我给她买了一件新衣服。", "Zuótiān shì wǒ qīzi de shēngrì, wǒ gěi tā mǎi le yí jiàn xīn yīfu.",
    "我送给妻子一件衣服。", "Wǒ sòng gěi qīzi yí jiàn yīfu.", true,
    "誕生日に妻へ服を買ったので、★の「服を贈った」と合っています。"],
  ["明天我要去机场送朋友，不能去打篮球了。", "Míngtiān wǒ yào qù jīchǎng sòng péngyou, bù néng qù dǎ lánqiú le.",
    "明天我去打篮球。", "Míngtiān wǒ qù dǎ lánqiú.", false,
    "本文は「バスケットボールに行けない」と言っているので、★とは合いません。"],
  ["这个房间里有两张桌子和四个椅子。", "Zhège fángjiān lǐ yǒu liǎng zhāng zhuōzi hé sì ge yǐzi.",
    "房间里有桌子。", "Fángjiān lǐ yǒu zhuōzi.", true,
    "机が2つあると書かれているので、★の「机がある」と合っています。"],
  ["我不喜欢喝咖啡，我每天早上都喝牛奶。", "Wǒ bù xǐhuan hē kāfēi, wǒ měitiān zǎoshang dōu hē niúnǎi.",
    "我每天早上喝咖啡。", "Wǒ měitiān zǎoshang hē kāfēi.", false,
    "本文は毎朝牛乳を飲むと言っているので、★のコーヒーとは合いません。"],
];

// 選択肢は同じ品詞でそろえ、文脈から答えが一つに決まるように作る。[文, 正解, [誤答2つ], ピンイン]
const HSK1_CLOZE = [
  ["天气很热，我想喝＿＿＿。", "水", ["米饭", "苹果"], "Tiānqì hěn rè, wǒ xiǎng hē ____."],
  ["我不太好，去＿＿＿看医生。", "医院", ["商店", "学校"], "Wǒ bú tài hǎo, qù ____ kàn yīshēng."],
  ["这个字我不认识，请你＿＿＿。", "读", ["买", "坐"], "Zhège zì wǒ bú rènshi, qǐng nǐ ____."],
  ["我的朋友很多，她的朋友很＿＿＿。", "少", ["大", "热"], "Wǒ de péngyou hěn duō, tā de péngyou hěn ____."],
  ["我买了三＿＿＿书。", "本", ["块", "岁"], "Wǒ mǎi le sān ____ shū."],
];

const HSK2_CLOZE_P2 = [
  ["明天有考试，我要在家＿＿＿。", "准备", ["旅游", "唱歌"], "Míngtiān yǒu kǎoshì, wǒ yào zài jiā ____."],
  ["这个西瓜三块钱，非常＿＿＿。", "便宜", ["贵", "远"], "Zhège xīguā sān kuài qián, fēicháng ____."],
  ["我每天早上七点＿＿＿，八点上班。", "起床", ["睡觉", "回答"], "Wǒ měitiān zǎoshang qī diǎn ____, bā diǎn shàngbān."],
  ["今天很冷，你＿＿＿这件衣服吧。", "穿", ["洗", "卖"], "Jīntiān hěn lěng, nǐ ____ zhè jiàn yīfu ba."],
  ["我不知道他的电话，你能＿＿＿我吗？", "告诉", ["介绍", "欢迎"], "Wǒ bù zhīdào tā de diànhuà, nǐ néng ____ wǒ ma?"],
];

// 句子匹配（本番形式）。左の文に対応する受け答えを選ぶ。[文, ピンイン, [[正解, ピンイン], [誤答, ピンイン] …]]
const HSK2_MATCH = [
  ["你的手机在哪儿？", "Nǐ de shǒujī zài nǎr?",
    [["就在桌子上。", "Jiù zài zhuōzi shàng."], ["我住在学校旁边。", "Wǒ zhù zài xuéxiào pángbiān."], ["他去机场了。", "Tā qù jīchǎng le."]]],
  ["这件衣服多少钱？", "Zhè jiàn yīfu duōshao qián?",
    [["一百二十块。", "Yìbǎi èrshí kuài."], ["我买了两件。", "Wǒ mǎi le liǎng jiàn."], ["红的很漂亮。", "Hóng de hěn piàoliang."]]],
  ["你怎么去公司？", "Nǐ zěnme qù gōngsī?",
    [["我坐公共汽车去。", "Wǒ zuò gōnggòng qìchē qù."], ["九点开始上班。", "Jiǔ diǎn kāishǐ shàngbān."], ["公司离这儿很远。", "Gōngsī lí zhèr hěn yuǎn."]]],
  ["明天你有时间吗？", "Míngtiān nǐ yǒu shíjiān ma?",
    [["对不起，我要考试。", "Duìbuqǐ, wǒ yào kǎoshì."], ["昨天我很累。", "Zuótiān wǒ hěn lèi."], ["这个题我不会做。", "Zhège tí wǒ bú huì zuò."]]],
  ["你身体好点儿了吗？", "Nǐ shēntǐ hǎo diǎnr le ma?",
    [["好多了，谢谢。", "Hǎo duō le, xièxie."], ["我在医院工作。", "Wǒ zài yīyuàn gōngzuò."], ["他昨天生病了。", "Tā zuótiān shēngbìng le."]]],
  ["你看见我的手表了吗？", "Nǐ kànjiàn wǒ de shǒubiǎo le ma?",
    [["是不是在椅子上？", "Shì bu shì zài yǐzi shàng?"], ["现在八点了。", "Xiànzài bā diǎn le."], ["这个手表很贵。", "Zhège shǒubiǎo hěn guì."]]],
  ["我们什么时候开始？", "Wǒmen shénme shíhou kāishǐ?",
    [["等他来了就开始。", "Děng tā lái le jiù kāishǐ."], ["在教室里。", "Zài jiàoshì lǐ."], ["我们一起去吧。", "Wǒmen yìqǐ qù ba."]]],
  ["你喜欢什么运动？", "Nǐ xǐhuan shénme yùndòng?",
    [["我最喜欢游泳。", "Wǒ zuì xǐhuan yóuyǒng."], ["昨天我们踢足球了。", "Zuótiān wǒmen tī zúqiú le."], ["那个男人是我朋友。", "Nàge nánrén shì wǒ péngyou."]]],
  ["欢迎你来我家玩。", "Huānyíng nǐ lái wǒ jiā wán.",
    [["谢谢，我下午就去。", "Xièxie, wǒ xiàwǔ jiù qù."], ["他们已经到了。", "Tāmen yǐjīng dào le."], ["这是我姐姐的房间。", "Zhè shì wǒ jiějie de fángjiān."]]],
  ["你为什么不吃了？", "Nǐ wèishénme bù chī le?",
    [["我吃了很多了。", "Wǒ chī le hěn duō le."], ["这个菜真好吃。", "Zhège cài zhēn hǎochī."], ["我想喝点儿水。", "Wǒ xiǎng hē diǎnr shuǐ."]]],
];

const HSK3_CLOZE = [
  ["请把空调＿＿＿一下，房间里有点儿冷。", "关", ["搬", "借"]], ["明天有考试，今天晚上我要认真＿＿＿。", "复习", ["表演", "结婚"]],
  ["这个问题不难，我相信你一定能＿＿＿。", "解决", ["出现", "经过"]], ["旅行以前别忘了＿＿＿护照。", "带", ["选择", "提高"]],
  ["我家离公司很远，坐地铁比较＿＿＿。", "方便", ["安静", "新鲜"]], ["他每天都去锻炼，身体越来越＿＿＿。", "健康", ["简单", "年轻"]],
  ["请你再说一次，我没听＿＿＿。", "清楚", ["干净", "认真"]], ["除了汉语以外，她＿＿＿会说日语。", "还", ["才", "被"]],
  ["这条裤子太长了，那条比较＿＿＿。", "短", ["有名", "热情"]], ["过马路的时候，请大家＿＿＿车。", "注意", ["影响", "同意"]],
];

const HSK3_RESPONSES = [
  ["你觉得这个办法怎么样？", "我觉得可以试一试。", ["我昨天才到。", "他正在办公室。"]], ["会议什么时候结束？", "下午四点左右。", ["一共十个人。", "在银行旁边。"]],
  ["你的护照找到了吗？", "找到了，在包里。", ["我打算去旅游。", "这张照片很好。"]], ["能帮我搬一下箱子吗？", "当然，没问题。", ["箱子是蓝色的。", "我住在三层。"]],
  ["你怎么又迟到了？", "路上车太多了。", ["考试很简单。", "我已经吃饱了。"]], ["医生怎么说？", "他说我要多休息。", ["药在桌子上。", "医院离这儿很近。"]],
  ["你习惯这里的天气了吗？", "差不多已经习惯了。", ["我以前住在南方。", "这里有很多超市。"]], ["周末有什么打算？", "我想和朋友去爬山。", ["昨天刮风了。", "地图在包里。"]],
  ["这次比赛谁得了第一？", "我们班的小王。", ["比赛下周举行。", "我最喜欢体育。"]], ["你为什么换工作？", "因为新公司离家更近。", ["经理正在开会。", "工作已经完成了。"]],
];

const PINYIN = {
  水:"shuǐ", 茶:"chá", 米饭:"mǐfàn", 三点:"sān diǎn", 两点:"liǎng diǎn", 四点:"sì diǎn", 学校:"xuéxiào", 医院:"yīyuàn", 商店:"shāngdiàn",
  小王的:"Xiǎo Wáng de", 小李的:"Xiǎo Lǐ de", 老师的:"lǎoshī de", 不会:"bú huì", 会:"huì", 不是:"bú shì", 下雨:"xiàyǔ", 晴:"qíng", 雪:"xuě",
  工作忙:"gōngzuò máng", 不饿:"bú è", 等朋友:"děng péngyou", 太大:"tài dà", 太小:"tài xiǎo", 太贵:"tài guì", 跑步:"pǎobù", 游泳:"yóuyǒng", 打篮球:"dǎ lánqiú",
  四十分钟:"sìshí fēnzhōng", 十四分钟:"shísì fēnzhōng", 一个小时:"yí ge xiǎoshí", 走路:"zǒulù", 坐汽车:"zuò qìchē", 骑自行车:"qí zìxíngchē",
  十二岁:"shí'èr suì", 二十岁:"èrshí suì", 十岁:"shí suì", 八十元:"bāshí yuán", 一百元:"yìbǎi yuán", 一百二十元:"yìbǎi èrshí yuán",
  生病:"shēngbìng", 很累:"hěn lèi", 很饿:"hěn è", 半小时:"bàn xiǎoshí", 一小时:"yì xiǎoshí", 两小时:"liǎng xiǎoshí",
  苹果:"píngguǒ", 西瓜:"xīguā", 水果:"shuǐguǒ", 准备:"zhǔnbèi", 考试:"kǎoshì", 休息:"xiūxi", 公司:"gōngsī", 书:"shū", 手表:"shǒubiǎo", 手机:"shǒujī",
  走路:"zǒulù", 红色:"hóngsè", 白色:"báisè", 黑色:"hēisè", 七点:"qī diǎn", 八点:"bā diǎn", 九点:"jiǔ diǎn", 十点:"shí diǎn",
  十一点:"shíyī diǎn", 十二点:"shí'èr diǎn", 一点:"yī diǎn", 下雪:"xiàxuě", 晴天:"qíngtiān", 阴天:"yīntiān", 吃药:"chī yào", 去医院:"qù yīyuàn",
};

const READING_PROMPT_PINYIN = {
  "女的喝什么？": "Nǚ de hē shénme?", "现在几点？": "Xiànzài jǐ diǎn?", "女的去哪儿？": "Nǚ de qù nǎr?", "猫是谁的？": "Māo shì shéi de?", "女的会做饭吗？": "Nǚ de huì zuòfàn ma?",
};

function choice(label, level, extra = {}) {
  const pinyin = PINYIN[label] || byHanzi.get(label)?.pinyin;
  return { value: label, label, ...(level <= 2 && pinyin ? { pinyin } : {}), ...extra };
}
function choices(answer, distractors, level) { return [choice(answer, level), ...distractors.map((item) => choice(item, level))]; }
// 本番は指示が中国語だけなので、模試画面に日本語の補足を添える。
const HINTS = {
  "visual-judge": "音声を聞いて、図と内容が合っているかを判断します。",
  "visual-choice": "音声を聞いて、内容に合う図を選びます。",
  "audio-judge": "音声を聞いて、画面の文と内容が合っているかを判断します。",
  "audio-response": "質問の音声を聞いて、ふさわしい受け答えを選びます。",
  "audio-dialogue": "会話のあと、間をおいて読まれる設問（问：〜）に答えます。",
  "audio-long-dialogue": "少し長い会話のあと、間をおいて読まれる設問（问：〜）に答えます。",
  "reading-visual-judge": "文を読んで、図と内容が合っているかを判断します。",
  "reading-visual-choice": "文を読んで、内容に合う図を選びます。",
  "reading-response": "問いかけに対する受け答えとして正しいものを選びます。",
  "reading-cloze": "空欄に入る言葉を選びます。",
  "reading-judge": "本文を読み、★の文が本文と合っているかを判断します（一致＝对／不一致＝不对）。",
  "reading-comprehension": "短文を読んで、設問に答えます。",
  reorder: "示された語句を並べ替えて、正しい文を作ります。",
  input: "カッコ内のピンインが表す漢字を書きます。",
};
function q(id, skill, part, kind, fields) { return { id, skill, part, kind, ...(HINTS[kind] ? { hint: HINTS[kind] } : {}), ...fields }; }
function audioFile(id) { return `audio/sentences/${id}.wav`; }
function wordChoices(answerWord, level, offset) {
  const pool = vocab[level];
  const answer = byHanzi.get(answerWord) || pool.find((word) => word.hanzi.startsWith(answerWord));
  const distractors = [1, 2].map((step) => pool[(pool.indexOf(answer) + offset + step * 17) % pool.length]).filter(Boolean);
  return [answer, ...distractors].map((word) => ({ value: word.id, label: word.hanzi, ...(level <= 2 ? { pinyin: word.pinyin } : {}) }));
}

function visualListening(level, start, count, part, mode) {
  const scenes = SCENES[level].slice(start, start + count);
  return scenes.map((scene, index) => {
    const id = `hsk${level}-l${part}-${String(index + 1).padStart(2, "0")}`;
    const fields = { audioText: scene[1], audioFile: audioFile(id), instruction: mode === "judge" ? "请听录音，判断内容是否与图示一致。" : "请听录音，选择相应的图示。", explanation: scene[1] };
    if (mode === "judge") {
      const shown = index % 2 ? SCENES[level][(start + index + 3) % SCENES[level].length] : scene;
      return q(id, "listening", part, "visual-judge", { ...fields, visual: { symbol: shown[0], alt: shown[3] }, choices: [choice("true", level, { label: "对" }), choice("false", level, { label: "不对" })], correct: String(index % 2 === 0) });
    }
    const others = [SCENES[level][(start + index + 4) % SCENES[level].length], SCENES[level][(start + index + 7) % SCENES[level].length]];
    return q(id, "listening", part, "visual-choice", { ...fields, choices: [scene, ...others].map((item) => choice(item[0], level, { ariaLabel: item[3] })), correct: scene[0] });
  });
}

function differentScene(scenes, scene, offset) {
  for (let step = 1; step <= scenes.length; step += 1) {
    const candidate = scenes[(offset + step) % scenes.length];
    if (candidate[0] !== scene[0]) return candidate;
  }
  throw new Error("図示の異なる聴解選択肢を作れません");
}

function pooledVisualListening(level, scenes, part, mode, firstNumber) {
  return scenes.map((scene, index) => {
    const id = `hsk${level}-l${part}-${String(firstNumber + index).padStart(3, "0")}`;
    const fields = { audioText: scene[1], audioFile: audioFile(id), instruction: mode === "judge" ? "请听录音，判断内容是否与图示一致。" : "请听录音，选择相应的图示。", explanation: scene[1] };
    if (mode === "judge") {
      const isCorrect = index % 2 === 0;
      const shown = isCorrect ? scene : differentScene(scenes, scene, index + 7);
      return q(id, "listening", part, "visual-judge", { ...fields, visual: { symbol: shown[0], alt: shown[3] }, choices: [choice("true", level, { label: "对" }), choice("false", level, { label: "不对" })], correct: String(isCorrect) });
    }
    const others = [differentScene(scenes, scene, index + 11), differentScene(scenes, scene, index + 37)];
    if (others[0][0] === others[1][0]) others[1] = differentScene(scenes, scene, index + 73);
    return q(id, "listening", part, "visual-choice", { ...fields, choices: [scene, ...others].map((item) => choice(item[0], level, { ariaLabel: item[3] })), correct: scene[0] });
  });
}

function dialogueQuestions(level, start, count, part, long = false) {
  return DIALOGUES[level].slice(start, start + count).map((item, index) => {
    const id = `hsk${level}-l${part}-${String(index + 1).padStart(2, "0")}`;
    return q(id, "listening", part, long ? "audio-long-dialogue" : "audio-dialogue", { audioText: item[0], audioFile: audioFile(id), prompt: item[1], choices: choices(item[2], item[3], level), correct: item[2], instruction: long ? "请听较长对话，选择正确答案。" : "请听对话，选择正确答案。", explanation: `${item[1]} — ${item[2]}` });
  });
}

function pooledDialogueQuestions(level, source, part, long, firstNumber) {
  return source.map((item, index) => {
    const id = `hsk${level}-l${part}-${String(firstNumber + index).padStart(3, "0")}`;
    return q(id, "listening", part, long ? "audio-long-dialogue" : "audio-dialogue", { audioText: item[0], audioFile: audioFile(id), prompt: item[1], choices: choices(item[2], item[3], level), correct: item[2], instruction: long ? "请听较长对话，选择正确答案。" : "请听对话，选择正确答案。", explanation: `${item[1]} — ${item[2]}` });
  });
}

function readingVisual(level, start, count, part, judge = false) {
  return SCENES[level].slice(start, start + count).map((scene, index) => {
    const id = `hsk${level}-r${part}-${String(index + 1).padStart(2, "0")}`;
    if (judge) {
      const shown = index % 2 ? SCENES[level][(start + index + 2) % SCENES[level].length] : scene;
      return q(id, "reading", part, "reading-visual-judge", { prompt: scene[1], promptPinyin: scene[2], visual: { symbol: shown[0], alt: shown[3] }, choices: [choice("true", level, { label: "对" }), choice("false", level, { label: "不对" })], correct: String(index % 2 === 0), instruction: "请判断句子是否与图示一致。", explanation: scene[1] });
    }
    const others = [SCENES[level][(start + index + 3) % SCENES[level].length], SCENES[level][(start + index + 6) % SCENES[level].length]];
    return q(id, "reading", part, "reading-visual-choice", { prompt: scene[1], promptPinyin: scene[2], choices: [scene, ...others].map((item) => choice(item[0], level, { ariaLabel: item[3] })), correct: scene[0], instruction: "请选择与句子相应的图示。", explanation: scene[1] });
  });
}

function readingResponses(level, source, part) {
  return source.map((item, index) => q(`hsk${level}-r${part}-${String(index + 1).padStart(2, "0")}`, "reading", part, "reading-response", { prompt: item[0], ...(level <= 2 && READING_PROMPT_PINYIN[item[0]] ? { promptPinyin: READING_PROMPT_PINYIN[item[0]] } : {}), choices: choices(item[1], item[2], level), correct: item[1], instruction: "请选择与问句相对应的回答。", explanation: `${item[0]} — ${item[1]}` }));
}

function authoredMatch(level, table, part) {
  return table.map(([prompt, promptPinyin, options], index) =>
    q(`hsk${level}-r${part}-${String(index + 1).padStart(2, "0")}`, "reading", part, "reading-response", {
      prompt,
      ...(level <= 2 && promptPinyin ? { promptPinyin } : {}),
      choices: options.map(([label, pinyin]) => ({ value: label, label, ...(level <= 2 && pinyin ? { pinyin } : {}) })),
      correct: options[0][0],
      instruction: "请选择与句子相对应的一句话。",
      explanation: `${prompt} — ${options[0][0]}`,
    }));
}

function authoredCloze(level, table, part) {
  return table.map(([prompt, answer, distractors, promptPinyin], index) => {
    const word = byHanzi.get(answer);
    return q(`hsk${level}-r${part}-${String(index + 1).padStart(2, "0")}`, "reading", part, "reading-cloze", {
      ...(word ? { wordId: word.id } : {}),
      prompt,
      ...(promptPinyin ? { promptPinyin } : {}),
      choices: choices(answer, distractors, level),
      correct: answer,
      instruction: "请选择合适的词语填空。",
      explanation: prompt.replace("＿＿＿", answer),
    });
  });
}

function blankPinyin(word) {
  return word.examplePinyin.replace(new RegExp(word.pinyin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "____");
}

function readingCloze(level, words, part, startOffset = 0) {
  return words.map((word, index) => q(`hsk${level}-r${part}-${String(index + 1).padStart(2, "0")}`, "reading", part, "reading-cloze", { wordId: word.id, prompt: word.example.replace(word.hanzi, "＿＿＿"), promptPinyin: level <= 2 ? blankPinyin(word) : undefined, choices: wordChoices(word.hanzi.replace(/[（）].*?[）]/g, ""), level, startOffset + index * 3), correct: word.id, instruction: "请选择合适的词语填空。", explanation: word.example }));
}

function buildLevel1() {
  const listening = [...visualListening(1, 0, 5, 1, "judge"), ...visualListening(1, 5, 5, 2, "choice"), ...visualListening(1, 10, 5, 3, "choice"), ...dialogueQuestions(1, 0, 5, 4)];
  const reading = [...readingVisual(1, 15, 5, 1, true), ...readingVisual(1, 20, 5, 2), ...readingResponses(1, DIALOGUES[1].slice(0, 5).map((item) => [item[1], item[2], item[3]]), 3), ...authoredCloze(1, HSK1_CLOZE, 4)];
  return [...listening, ...reading];
}

function buildLevel2() {
  const extraScenes = buildHsk2ExtraScenes();
  const shortDialoguePool = buildHsk2ShortDialoguePool();
  const longDialoguePool = buildHsk2LongDialoguePool();
  const listening = [
    ...visualListening(2, 0, 10, 1, "judge"),
    ...pooledVisualListening(2, extraScenes.slice(0, 90), 1, "judge", 11),
    ...visualListening(2, 10, 10, 2, "choice"),
    ...pooledVisualListening(2, extraScenes.slice(90), 2, "choice", 11),
    ...dialogueQuestions(2, 0, 10, 3),
    ...pooledDialogueQuestions(2, shortDialoguePool, 3, false, 11),
    ...dialogueQuestions(2, 10, 5, 4, true),
    ...pooledDialogueQuestions(2, longDialoguePool, 4, true, 6),
  ];
  const readingJudge = HSK2_JUDGE.map(([prompt, promptPinyin, statement, statementPinyin, isTrue, note], index) =>
    q(`hsk2-r3-${String(index + 1).padStart(2, "0")}`, "reading", 3, "reading-judge", {
      prompt, promptPinyin, subPrompt: statement, subPromptPinyin: statementPinyin,
      choices: [choice("true", 2, { label: "对" }), choice("false", 2, { label: "不对" })],
      correct: String(isTrue), instruction: "请判断对错。", explanation: note,
    }));
  const reading = [...readingVisual(2, 20, 5, 1), ...authoredCloze(2, HSK2_CLOZE_P2, 2), ...readingJudge, ...authoredMatch(2, HSK2_MATCH, 4)];
  return [...listening, ...reading];
}

function buildLevel3() {
  const listening1 = visualListening(3, 0, 10, 1, "choice");
  const listening2 = HSK3_STATEMENTS.map((item, index) => {
    const id = `hsk3-l2-${String(index + 1).padStart(2, "0")}`;
    return q(id, "listening", 2, "audio-judge", { audioText: item[0], audioFile: audioFile(id), prompt: item[1], choices: [choice("true", 3, { label: "对" }), choice("false", 3, { label: "不对" })], correct: String(item[2]), instruction: "请听录音，判断内容是否与句子一致。", explanation: item[2] ? "对" : "不对" });
  });
  const listening4 = HSK3_LONG_DIALOGUES.map((item, index) => {
    const id = `hsk3-l4-${String(index + 1).padStart(2, "0")}`;
    return q(id, "listening", 4, "audio-long-dialogue", { audioText: item[0], audioFile: audioFile(id), prompt: item[1], choices: choices(item[2], item[3], 3), correct: item[2], instruction: "请听较长对话，选择正确答案。", explanation: `${item[1]} — ${item[2]}` });
  });
  const listening = [...listening1, ...listening2, ...dialogueQuestions(3, 0, 10, 3), ...listening4];
  const reading1 = readingResponses(3, HSK3_RESPONSES, 1);
  const reading2 = authoredCloze(3, HSK3_CLOZE, 2);
  const reading3 = HSK3_PASSAGES.map((item, index) => q(`hsk3-r3-${String(index + 1).padStart(2, "0")}`, "reading", 3, "reading-comprehension", { prompt: item[0], subPrompt: item[1], choices: choices(item[2], item[3], 3), correct: item[2], instruction: "请阅读短文，选择正确答案。", explanation: `${item[1]} — ${item[2]}` }));
  const reorder = HSK3_REORDER.map((item, index) => q(`hsk3-w1-${String(index + 1).padStart(2, "0")}`, "writing", 1, "reorder", { tokens: item[0], answer: item[1], instruction: "请把下面的词语排列成正确的句子。", selected: [] }));
  const input = HSK3_INPUT.map((item, index) => q(`hsk3-w2-${String(index + 1).padStart(2, "0")}`, "writing", 2, "input", { sentence: item[0], answer: item[1], instruction: "请根据拼音在空格上写汉字。" }));
  return [...listening, ...reading1, ...reading2, ...reading3, ...reorder, ...input];
}

const forms = { 1: buildLevel1(), 2: buildLevel2(), 3: buildLevel3() };
const expected = { 1: { total: 40, listening: 20, reading: 20, writing: 0 }, 2: { total: 375, listening: 350, reading: 25, writing: 0 }, 3: { total: 80, listening: 40, reading: 30, writing: 10 } };
for (const level of [1, 2, 3]) {
  const questions = forms[level];
  const counts = Object.fromEntries(["listening", "reading", "writing"].map((skill) => [skill, questions.filter((question) => question.skill === skill).length]));
  if (questions.length !== expected[level].total || Object.entries(counts).some(([skill, count]) => count !== expected[level][skill])) throw new Error(`HSK ${level} count mismatch: ${JSON.stringify(counts)}`);
  if (new Set(questions.map((question) => question.id)).size !== questions.length) throw new Error(`HSK ${level}: duplicate ids`);
  const audio = questions.filter((question) => question.skill === "listening");
  const duplicateAudio = audio.filter((question, index) => audio.findIndex((item) => item.audioText === question.audioText) !== index);
  if (duplicateAudio.length) throw new Error(`HSK ${level}: duplicate listening prompts: ${duplicateAudio.map((question) => question.id).join(", ")}`);
  for (const item of audio) {
    const values = item.choices?.map((entry) => entry.value) || [];
    if (new Set(values).size !== values.length) throw new Error(`${item.id}: 聴解の選択肢が重複しています`);
    if (!values.includes(item.correct)) throw new Error(`${item.id}: 聴解の正解が選択肢にありません`);
  }
  if (level === 2) {
    const expectedParts = { 1: 100, 2: 100, 3: 100, 4: 50 };
    for (const [part, count] of Object.entries(expectedParts)) {
      const actual = audio.filter((question) => question.part === Number(part)).length;
      if (actual !== count) throw new Error(`HSK 2 listening part ${part}: expected ${count}, got ${actual}`);
    }
  }
  // 聴解で聞いた素材を読解でもう一度出さない（聞き取れなくても読めば解けてしまうため）。
  const listeningTexts = questions.filter((question) => question.skill === "listening").map((question) => (question.audioText || "").split("问：")[0]).filter(Boolean);
  for (const item of questions.filter((question) => question.skill === "reading")) {
    const body = `${item.prompt || ""}${item.subPrompt || ""}`;
    const shared = listeningTexts.find((text) => text.length > 8 && body.includes(text));
    if (shared) throw new Error(`${item.id}: 聴解と同じ素材を読解でも使っています → ${shared.slice(0, 24)}`);
  }
  // HSK3第4部分の対話は第3部分より長いこと（本番は較長対話）。
  const turns = (text) => (text.match(/[男女]：/g) || []).length;
  const shortDialogues = questions.filter((question) => question.kind === "audio-dialogue");
  const longDialogues = questions.filter((question) => question.kind === "audio-long-dialogue");
  if (level === 3 && longDialogues.length) {
    const average = (items) => items.reduce((sum, item) => sum + turns(item.audioText), 0) / items.length;
    if (average(longDialogues) <= average(shortDialogues)) throw new Error(`HSK ${level}: 第4部分の対話が第3部分より長くありません`);
    const tooShort = longDialogues.find((item) => turns(item.audioText) < 3);
    if (tooShort) throw new Error(`${tooShort.id}: 較長対話の発話が3つ未満です（${turns(tooShort.audioText)}）`);
  }
  // 穴埋め問題は、空欄・選択肢・級の範囲を検査する。
  for (const item of questions.filter((question) => question.kind === "reading-cloze")) {
    if (!item.prompt.includes("＿＿＿")) throw new Error(`${item.id}: 空欄（＿＿＿）がありません`);
    if (item.prompt.replace("＿＿＿", "").includes(item.correct)) throw new Error(`${item.id}: 正解「${item.correct}」が問題文にも出ています`);
    if (level <= 2 && !item.promptPinyin?.includes("____")) throw new Error(`${item.id}: ピンインに空欄（____）がありません`);
    const labels = item.choices.map((entry) => entry.label);
    if (new Set(labels).size !== labels.length) throw new Error(`${item.id}: 選択肢が重複しています`);
    if (!labels.includes(item.correct)) throw new Error(`${item.id}: 正解が選択肢にありません`);
    for (const label of labels) {
      const wordLevel = levelByHanzi.get(label);
      if (!wordLevel) throw new Error(`${item.id}: 選択肢「${label}」が語彙データにありません`);
      if (wordLevel > level) throw new Error(`${item.id}: 選択肢「${label}」はHSK${wordLevel}の語です`);
    }
    for (const char of item.prompt.replace("＿＿＿", "")) {
      if (/[一-鿿]/u.test(char) && !levelChars[level].has(char)) console.warn(`  警告 ${item.id}: 「${char}」はHSK1〜${level}の語彙にない漢字です → ${item.prompt}`);
    }
  }
  // 判断对错は、本文と★の文がそろっていて、正誤が偏っていないことを検査する。
  const judges = questions.filter((question) => question.kind === "reading-judge");
  for (const item of judges) {
    if (!item.subPrompt) throw new Error(`${item.id}: ★の文がありません`);
    if (item.prompt === item.subPrompt) throw new Error(`${item.id}: 本文と★の文が同じです`);
    if (!["true", "false"].includes(item.correct)) throw new Error(`${item.id}: 正解が对／不对ではありません`);
    if (level <= 2 && !(item.promptPinyin && item.subPromptPinyin)) throw new Error(`${item.id}: ピンインが足りません`);
    for (const char of `${item.prompt}${item.subPrompt}`) {
      if (/[一-鿿]/u.test(char) && !levelChars[level].has(char)) console.warn(`  警告 ${item.id}: 「${char}」はHSK1〜${level}の語彙にない漢字です`);
    }
  }
  if (judges.length && new Set(judges.map((item) => item.correct)).size < 2) throw new Error(`HSK ${level}: 判断对错の正解が片方に偏っています`);
  // 句子匹配は、選択肢がそろっていて級の範囲に収まっていることを検査する。
  for (const item of questions.filter((question) => question.kind === "reading-response")) {
    const labels = item.choices.map((entry) => entry.label);
    if (new Set(labels).size !== labels.length) throw new Error(`${item.id}: 選択肢が重複しています`);
    if (!labels.includes(item.correct)) throw new Error(`${item.id}: 正解が選択肢にありません`);
    if (level <= 2 && item.choices.some((entry) => !entry.pinyin)) console.warn(`  警告 ${item.id}: ピンインのない選択肢があります`);
    for (const char of `${item.prompt}${labels.join("")}`) {
      if (/[一-鿿]/u.test(char) && !levelChars[level].has(char)) console.warn(`  警告 ${item.id}: 「${char}」はHSK1〜${level}の語彙にない漢字です`);
    }
  }
  const payload = {
    version: level === 2 ? 3 : 2,
    level,
    format: "HSK 2.0（日本実施形式）・写真問題は記号イラストで代替",
    generatedAt: new Date().toISOString(),
    ...(level === 2 ? { questionSelection: { listening: { 1: 10, 2: 10, 3: 10, 4: 5 } } } : {}),
    questions,
  };
  fs.writeFileSync(path.join(root, "data", `mock-hsk${level}.json`), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`HSK ${level}: ${questions.length}問（聴解${counts.listening}・読解${counts.reading}・作文${counts.writing}）`);
}
