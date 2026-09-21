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

// 本番でも固有名詞は級外の字を使うので、人名・地名の字だけは語彙チェックの対象外にする。
const PROPER_NOUN_CHARS = new Set(["王", "李", "海"]);
// 字はHSK1〜3にあるがHSK4以上の語。字面のチェックでは拾えないため語として弾く。
const BLOCKED_WORDS = ["楼梯", "味道", "本来", "只好", "提前", "差点儿", "差不多", "左右", "放学", "马路", "办事", "直接", "内容", "日语", "试一试"];
// 語彙の基準を満たしている級。HSK2は本文の整理が済むまで警告のみ。
const STRICT_VOCAB_LEVELS = new Set([1, 3]);
// 別の問題と丸ごと重なってはいけない文字数。
const DUPLICATE_NGRAM = 6;
// 同じ場面の語が1回の模試で何問まで出てよいかの目安。
const TOPIC_LIMIT = 4;
// 場面を表すラベル（data/word-tags.json）が付いた語を「題材」とみなす。
// 時間・気持ち・考えなどの語はどの問題にも自然に出るので数えない。
const wordTagData = JSON.parse(fs.readFileSync(path.join(root, "data", "word-tags.json"), "utf8"));
const wordTags = wordTagData.words;
const TOPIC_TAGS = new Set(["travel", "food", "shopping", "school", "work", "home", "body", "weather", "hobby", "tech", "animal", "clothes", "people", "family"]);

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
    ["👥", "同事们正在办公室开会。", "Tóngshìmen zhèngzài bàngōngshì kāihuì.", "事務室で会議する人々"], ["🛂", "旅行以前别忘了带护照。", "Lǚxíng yǐqián bié wàng le dài hùzhào.", "パスポートを持つ旅行者"],
    ["📦", "他们正在搬家。", "Tāmen zhèngzài bānjiā.", "引っ越しをする人々"], ["⛰️", "周末我们打算去爬山。", "Zhōumò wǒmen dǎsuàn qù páshān.", "週末に山へ登る人々"],
  ],
};

const DIALOGUES = {
  1: [
    ["男：你喝茶吗？女：不，我喝水。问：女的喝什么？", "女的喝什么？", "水", ["茶", "米饭"]],
    ["女：现在几点？男：三点。问：现在几点？", "现在几点？", "三点", ["五点", "四点"]],
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
    ["男：你怎么不坐电梯？女：我住三层，自己走上去还能锻炼身体。问：女的为什么不坐电梯？", "女的为什么不坐电梯？", "锻炼身体", ["电梯坏了", "住一层"]],
    ["女：您好，您要喝点儿什么？男：一杯咖啡，再来一块蛋糕。问：他们最可能在哪儿？", "他们最可能在哪儿？", "饭馆", ["银行", "教室"]],
    ["男：明天是妈妈的生日，我们送什么好？女：她最喜欢花，我们买些花吧。问：他们打算送什么？", "他们打算送什么？", "花", ["蛋糕", "手表"]],
    ["女：作业做完了吗？男：都写完了，还要检查一下。问：男的接下来要做什么？", "男的接下来要做什么？", "检查作业", ["开始写", "去上课"]],
    ["男：会议已经开始了吗？女：还没有，经理十分钟以后才来。问：经理什么时候来？", "经理什么时候来？", "十分钟以后", ["十分钟以前", "马上"]],
    ["女：你的数学成绩怎么样？男：这次比上次提高了不少。问：男的数学成绩怎么样？", "男的数学成绩怎么样？", "比以前好", ["没有变化", "越来越差"]],
    ["男：外面这么冷，你怎么只穿一件衬衫？女：我出门的时候太阳还很好。问：关于女的，可以知道什么？", "关于女的，可以知道什么？", "穿得太少", ["带了伞", "生病了"]],
    ["女：请问，洗手间在哪儿？男：一直向前走，在电梯的右边。问：洗手间在哪儿？", "洗手间在哪儿？", "电梯右边", ["电梯左边", "办公室旁边"]],
    ["男：你觉得这次比赛怎么样？女：虽然没得第一，但是大家都很努力。问：女的怎么看这次比赛？", "女的怎么看这次比赛？", "大家很努力", ["比赛太容易", "成绩最好"]],
    ["女：你怎么才到？男：路上突然下大雨，公共汽车也来得很慢。问：男的为什么迟到？", "男的为什么迟到？", "汽车来得慢", ["忘了时间", "起床晚了"]],
    ["男：这件蓝衬衫你穿着很好看。女：可是我更喜欢那件白的。问：女的喜欢哪件？", "女的喜欢哪件？", "白衬衫", ["蓝衬衫", "红裙子"]],
    ["女：听说你找到新工作了？男：是的，下个月去银行上班。问：男的要去哪儿工作？", "男的要去哪儿工作？", "银行", ["学校", "超市"]],
    ["男：你认识新来的同事吗？女：昨天刚见面，她很热情。问：女的觉得新同事怎么样？", "女的觉得新同事怎么样？", "很热情", ["很安静", "很奇怪"]],
    ["男：你的房间真干净。女：我每个星期六都打扫一次。问：女的多久打扫一次房间？", "女的多久打扫一次房间？", "每星期一次", ["每天一次", "每月一次"]],
    ["男：你不是打算坐地铁吗？女：地铁今天有问题，我就坐出租车了。问：女的为什么坐出租车？", "女的为什么坐出租车？", "地铁有问题", ["时间太早", "行李太多"]],
    ["女：这个字我不认识，你能教我吗？男：好，我先写给你看。问：男的要做什么？", "男的要做什么？", "写给她看", ["教她唱歌", "给她字典"]],
    ["男：你的汉语水平提高得真快。女：我每天听新闻，还经常和中国朋友说话。问：女的怎么学习汉语？", "女的怎么学习汉语？", "听新闻说话", ["只做作业", "只看电影"]],
    ["女：冰箱里什么都没有了。男：那我们先去超市，然后回家做饭。问：他们先做什么？", "他们先做什么？", "去超市", ["回家", "去饭馆"]],
    ["男：你为什么一直看地图？女：我在找附近的宾馆，宾馆就在前面。问：女的在找什么？", "女的在找什么？", "宾馆", ["银行", "图书馆"]],
  ],
};

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
  ["男：这条裤子多少钱？女：一百五十元，比上个月便宜了五十。男：那我要一条蓝色的。女：好的，给你。问：这条裤子上个月多少钱？",
    "这条裤子上个月多少钱？", "二百元", ["一百五十元", "五十元"]],
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
    "他为什么常去那家超市？", "水果新鲜便宜", ["因为离我家很远", "因为每天都去一次"]],
  ["小李昨天参加了学校的音乐表演。开始的时候他有点儿着急，但是同学们都说他唱得很好。",
    "同学们觉得小李唱得怎么样？", "唱得很好", ["有点儿着急", "同学们都没参加"]],
  ["明天的考试非常重要，老师让大家八点以前到教室。如果有事不能参加，一定要早点儿告诉他。",
    "不能参加考试的人要做什么？", "早点儿告诉老师", ["八点以前到教室", "考试以后告诉老师"]],
  ["学校的图书馆周末也开门，那儿又大又安静。我常常在那儿看一下午书，有时候还能遇到同学。",
    "根据这段话，可以知道什么？", "图书馆周末开门", ["图书馆周末不开门", "同学们都不去那儿"]],
  ["我妹妹很喜欢动物，她家里有一只猫。她每天下课以后，都要先跟猫玩一会儿，然后才做作业。",
    "妹妹下课以后先做什么？", "跟猫玩", ["做作业", "看电视"]],
  ["这个城市春天的花园最漂亮，很多人都来照相。夏天热的时候，大家喜欢去河边玩。",
    "根据这段话，春天这个城市怎么样？", "花园很漂亮", ["夏天的花园最漂亮", "很多人去河边照相"]],
  ["张老师上课很认真，他总是先讲重要的地方，然后让我们自己练习。所以同学们都很喜欢他的课。",
    "同学们为什么喜欢张老师的课？", "他讲得认真", ["他的课很短", "他常常唱歌"]],
  ["昨天我坐出租车去机场，路上的车太多，开得很慢，所以我迟到了十分钟。",
    "他昨天为什么迟到？", "路上车太多", ["起床晚了", "坐错了车"]],
  ["我爸爸今年五十岁了，还是很喜欢运动。他每天早上都去河边跑步，然后回家吃早饭。",
    "爸爸早上做什么？", "去跑步", ["看报纸", "去超市买东西"]],
  ["我打算下个月去北京旅游，已经买好了飞机票。听说那儿秋天的天气最舒服，所以很多人都选择这个季节去。",
    "他为什么选择下个月去北京？", "天气舒服", ["票很便宜", "朋友在那儿"]],
];

// 書写はHSK3の文法・漢字で出題する。
const HSK3_REORDER = [
  [["他", "把", "那本", "字典", "放在", "桌子上"], "他把那本字典放在桌子上。", "彼はその辞書を机の上に置きました。"],
  [["这里", "的", "环境", "越来越", "好了"], "这里的环境越来越好了。", "ここの環境はますます良くなりました。"],
  [["她", "一边", "听音乐", "一边", "做作业"], "她一边听音乐一边做作业。", "彼女は音楽を聴きながら宿題をします。"],
  [["我", "的", "自行车", "被", "朋友", "骑走了"], "我的自行车被朋友骑走了。", "私の自転車は友達に乗って行かれました。"],
  [["这个", "问题", "比", "那个", "容易"], "这个问题比那个容易。", "この問題はあの問題より簡単です。"],
];

const HSK3_INPUT = [
  ["我的腿有点儿（téng）。", "疼", "私の脚は少し痛いです。"], ["她穿了一条（lán）色的裙子。", "蓝", "彼女は青いスカートをはいています。"], ["今天下午有雨，出门要带（sǎn）。", "伞", "今日の午後は雨なので、出かけるときは傘を持っていく必要があります。"],
  ["妹妹的（liǎn）红了。", "脸", "妹の顔が赤くなりました。"], ["天黑了，请把（dēng）打开。", "灯", "暗くなったので、明かりをつけてください。"],
];

const HSK3_STATEMENTS = [
  ["小李最近每天都锻炼，所以身体比以前好多了。", "小李的身体有了变化。", true],
  ["外面虽然刮风，但是太阳很好，我们还是决定去公园。", "因为天气不好，他们不去公园了。", false],
  ["我的手机昨天坏了，今天下午拿去检查。", "他的手机出了问题。", true],
  ["我以为护照在行李箱里，后来在桌子下面找到了。", "护照最后在行李箱里找到了。", false],
  ["这家宾馆离火车站很近，房间也很干净，就是有点儿贵。", "这家宾馆很方便。", true],
  ["妹妹发烧了，医生说她这两天必须在家休息。", "妹妹这两天要去学校。", false],
  ["张经理对这次表演很满意，还表示以后愿意帮忙。", "张经理喜欢这次表演。", true],
  ["我先去银行，然后到超市买东西，最后才回家。", "我回家以前去了两个地方。", true],
  ["他普通话说得不错，但是写汉字还比较慢。", "他不会说普通话。", false],
  ["这本字典是姐姐送我的生日礼物，我一直放在书包里。", "字典是他自己买的。", false],
];

// 判断对错（本番形式）。本文を読み、★の文が本文と合っているかを判断する。
// [本文, 本文ピンイン, ★の文, ★のピンイン, 正解(true=对), 解説]
// 聴解第3部分の出題プール（本番形式の短い対話＋設問）。場面と設問の種類を散らす。
const HSK2_SHORT_DIALOGUES = [
  ["女：你家离学校远吗？男：不远，走路十分钟就到。问：男的怎么去学校？", "男的怎么去学校？", "走路", ["坐车", "骑自行车"]],
  ["男：明天要下雪吗？女：不，明天是晴天。问：明天天气怎么样？", "明天天气怎么样？", "晴天", ["下雪", "下雨"]],
  ["女：你想喝咖啡还是茶？男：我要一杯咖啡。问：男的要喝什么？", "男的要喝什么？", "咖啡", ["茶", "牛奶"]],
  ["男：现在几点了？女：七点五十。问：现在几点？", "现在几点？", "七点五十", ["八点十分", "六点五十"]],
  ["女：你们家有几个人？男：四个，爸爸妈妈和弟弟。问：男的家有几个人？", "男的家有几个人？", "四个", ["三个", "五个"]],
  ["男：这个多少钱？女：三十五块。问：这个东西多少钱？", "这个东西多少钱？", "三十五块", ["三十块", "五十块"]],
  ["女：你在哪儿等我？男：我在教室里等你。问：男的在哪儿等？", "男的在哪儿等？", "教室", ["机场", "医院"]],
  ["男：你怎么了？女：我有点儿累，想休息一下。问：女的想做什么？", "女的想做什么？", "休息", ["跑步", "工作"]],
  ["女：你给妹妹买了什么？男：我买了一块手表。问：男的买了什么？", "男的买了什么？", "手表", ["手机", "衣服"]],
  ["男：外面冷吗？女：很冷，你穿这件衣服吧。问：女的让男的做什么？", "女的让男的做什么？", "穿衣服", ["开门", "喝水"]],
  ["女：我们坐公共汽车去吧。男：太慢了，我们坐出租车。问：他们打算怎么去？", "他们打算怎么去？", "坐出租车", ["坐公共汽车", "走路"]],
  ["男：你吃过饭了吗？女：还没有，我在等你。问：女的为什么没吃饭？", "女的为什么没吃饭？", "在等男的", ["不饿", "太忙"]],
  ["女：你今天几点下班？男：今天很忙，可能八点。问：男的今天几点下班？", "男的今天几点下班？", "八点", ["六点", "五点"]],
  ["男：你学汉语多长时间了？女：已经一年了。问：女的学汉语多久了？", "女的学汉语多久了？", "一年", ["两年", "一个月"]],
  ["女：这是你姐姐吗？男：不是，这是我妹妹。问：照片上的人是谁？", "照片上的人是谁？", "男的妹妹", ["男的姐姐", "男的妻子"]],
  ["男：你周末做什么？女：我常常去游泳。问：女的周末做什么？", "女的周末做什么？", "游泳", ["唱歌", "跳舞"]],
  ["女：我的手机在哪儿？男：就在桌子上。问：手机在哪儿？", "手机在哪儿？", "桌子上", ["椅子上", "房间外"]],
  ["男：明天去踢足球吗？女：听说明天下雨，别去了。问：他们明天做什么？", "他们明天做什么？", "不去踢足球", ["去踢足球", "去跑步"]],
  ["女：你买了几个鸡蛋？男：我买了一公斤。问：男的买了多少鸡蛋？", "男的买了多少鸡蛋？", "一公斤", ["两公斤", "十个"]],
  ["男：这本书是谁的？女：是老师的。问：书是谁的？", "书是谁的？", "老师的", ["学生的", "男的"]],
  ["女：你给谁打电话？男：给我哥哥打电话。问：男的给谁打电话？", "男的给谁打电话？", "哥哥", ["姐姐", "朋友"]],
  ["男：你喜欢什么颜色？女：我最喜欢白色。问：女的喜欢什么颜色？", "女的喜欢什么颜色？", "白色", ["红色", "黑色"]],
  ["女：你去过北京吗？男：去年去过一次。问：男的什么时候去的北京？", "男的什么时候去的北京？", "去年", ["今年", "上个月"]],
  ["男：明天有汉语课吗？女：没有，明天是星期六。问：明天为什么没有课？", "明天为什么没有课？", "是星期六", ["老师生病了", "教室太小"]],
];

// 聴解第4部分の出題プール（3〜4往復の較長対話）。
const HSK2_LONG_DIALOGUES = [
  ["男：外面还在下雨吗？女：是的，雨很大。男：那我们等一会儿再走。女：好，我也不想现在出去。问：他们为什么不走？",
    "他们为什么不走？", "因为下大雨", ["因为太累", "因为没时间"]],
  ["女：你昨天去哪儿了？男：我和朋友去看电影了。女：电影好看吗？男：很好看，你有时间也去吧。问：男的昨天做什么了？",
    "男的昨天做什么了？", "看电影", ["打篮球", "学习"]],
  ["男：这件衣服多少钱？女：一百二十块。男：太贵了，便宜点儿吧。女：那一百块吧。问：男的最后花了多少钱？",
    "男的最后花了多少钱？", "一百块", ["一百二十块", "二十块"]],
  ["女：明天几点开始上课？男：早上八点。女：那我七点起床。男：好，我们一起去学校。问：女的明天几点起床？",
    "女的明天几点起床？", "七点", ["八点", "六点"]],
  ["男：你的身体好点儿了吗？女：好多了，谢谢。男：还要吃药吗？女：医生说不用了。问：女的还要吃药吗？",
    "女的还要吃药吗？", "不用了", ["还要吃", "不知道"]],
  ["女：你会做中国菜吗？男：会一点儿，我最会做鱼。女：那今天晚上你做饭吧。男：没问题。问：男的今天晚上做什么？",
    "男的今天晚上做什么？", "做饭", ["洗衣服", "看电视"]],
  ["男：我们什么时候去旅游？女：下个月怎么样？男：下个月我很忙。女：那就等到十月吧。问：他们打算什么时候去旅游？",
    "他们打算什么时候去旅游？", "十月", ["下个月", "这个月"]],
  ["女：你找什么呢？男：我的手表不见了。女：是不是在房间里？男：我找过了，没有。问：男的在找什么？",
    "男的在找什么？", "手表", ["手机", "报纸"]],
  ["男：你每天怎么上班？女：我骑自行车，不坐公共汽车了。男：为什么？女：骑车又快又便宜。问：女的怎么上班？",
    "女的怎么上班？", "骑自行车", ["坐公共汽车", "走路"]],
  ["女：这个星期六你有时间吗？男：有，怎么了？女：我想请你来我家吃饭。男：太好了，我会去的。问：女的请男的做什么？",
    "女的请男的做什么？", "去她家吃饭", ["一起看电影", "去买东西"]],
];

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
// HSK1読解第3部分。聴解で使った対話は流用しない。[問いかけ, 正解, [誤答2つ]]
const HSK1_RESPONSES = [
  ["你叫什么名字？", "我叫小李。", ["我很高兴。", "这是我的书。"]],
  ["你喜欢喝什么？", "我喜欢喝茶。", ["我会做菜。", "我在家里。"]],
  ["今天星期几？", "今天星期六。", ["现在八点。", "我们去学校。"]],
  ["这是谁的书？", "是老师的。", ["在桌子上。", "我不认识。"]],
  ["你有几个朋友？", "我有三个。", ["他是学生。", "我很喜欢。"]],
];

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
  ["这个问题不难，我相信你一定能＿＿＿。", "解决", ["出现", "经过"]], ["明天要用的东西，别忘了＿＿＿在包里。", "放", ["选择", "提高"]],
  ["在网上买东西不用出门，比较＿＿＿。", "方便", ["安静", "新鲜"]], ["他每天都去锻炼，身体越来越＿＿＿。", "健康", ["简单", "年轻"]],
  ["请你再说一次，我没听＿＿＿。", "清楚", ["干净", "认真"]], ["除了苹果以外，她＿＿＿喜欢吃香蕉。", "还", ["才", "被"]],
  ["这条裤子太长了，那条比较＿＿＿。", "短", ["有名", "热情"]], ["开车的时候，请大家＿＿＿前面的车。", "注意", ["影响", "同意"]],
];

const HSK3_RESPONSES = [
  ["你觉得这个办法怎么样？", "我觉得很不错。", ["我昨天才到。", "他正在办公室。"]], ["会议什么时候结束？", "下午四点半。", ["一共十个人。", "在银行旁边。"]],
  ["你的护照找到了吗？", "找到了，在包里。", ["我打算去旅游。", "这张照片很好。"]], ["能帮我搬一下箱子吗？", "当然，没问题。", ["箱子是蓝色的。", "我住在三层。"]],
  ["你怎么又迟到了？", "路上车太多了。", ["考试很简单。", "我已经吃饱了。"]], ["医生怎么说？", "他说我要多休息。", ["药在桌子上。", "医院离这儿很近。"]],
  ["你习惯这里的天气了吗？", "已经习惯了。", ["我以前住在南方。", "这里有很多超市。"]], ["周末有什么打算？", "我想和朋友去爬山。", ["昨天刮风了。", "地图在包里。"]],
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
  "我叫小李。":"Wǒ jiào Xiǎo Lǐ.", "我很高兴。":"Wǒ hěn gāoxìng.", "这是我的书。":"Zhè shì wǒ de shū.",
  "我喜欢喝茶。":"Wǒ xǐhuan hē chá.", "我会做菜。":"Wǒ huì zuò cài.", "我在家里。":"Wǒ zài jiā lǐ.",
  "今天星期六。":"Jīntiān xīngqīliù.", "现在八点。":"Xiànzài bā diǎn.", "我们去学校。":"Wǒmen qù xuéxiào.",
  "是老师的。":"Shì lǎoshī de.", "在桌子上。":"Zài zhuōzi shang.", "我不认识。":"Wǒ bú rènshi.",
  "我有三个。":"Wǒ yǒu sān ge.", "他是学生。":"Tā shì xuésheng.", "我很喜欢。":"Wǒ hěn xǐhuan.",
  十一点:"shíyī diǎn", 十二点:"shí'èr diǎn", 一点:"yī diǎn", 下雪:"xiàxuě", 晴天:"qíngtiān", 阴天:"yīntiān", 吃药:"chī yào", 去医院:"qù yīyuàn",
};

const READING_PROMPT_PINYIN = {
  "你叫什么名字？": "Nǐ jiào shénme míngzi?", "你喜欢喝什么？": "Nǐ xǐhuan hē shénme?", "今天星期几？": "Jīntiān xīngqī jǐ?",
  "这是谁的书？": "Zhè shì shéi de shū?", "你有几个朋友？": "Nǐ yǒu jǐ ge péngyou?",
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
function audioFile(id) { return `audio/sentences/${id}.m4a`; }
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

function dialogueQuestions(level, start, count, part, long = false) {
  return DIALOGUES[level].slice(start, start + count).map((item, index) => {
    const id = `hsk${level}-l${part}-${String(index + 1).padStart(2, "0")}`;
    return q(id, "listening", part, long ? "audio-long-dialogue" : "audio-dialogue", { audioText: item[0], audioFile: audioFile(id), prompt: item[1], choices: choices(item[2], item[3], level), correct: item[2], instruction: long ? "请听较长对话，选择正确答案。" : "请听对话，选择正确答案。", explanation: `${item[1]} — ${item[2]}` });
  });
}

function dialoguePool(level, items, part, long = false) {
  return items.map((item, index) => {
    const id = `hsk${level}-l${part}-${String(index + 1).padStart(2, "0")}`;
    return q(id, "listening", part, long ? "audio-long-dialogue" : "audio-dialogue", {
      audioText: item[0], audioFile: audioFile(id), prompt: item[1], choices: choices(item[2], item[3], level), correct: item[2],
      instruction: long ? "请听较长对话，选择正确答案。" : "请听对话，选择正确答案。", explanation: `${item[1]} — ${item[2]}`,
    });
  });
}

function wordForms(word) {
  return [word.hanzi.replace(/（[^）]*）/g, ""), ...[...word.hanzi.matchAll(/（([^）]*)）/g)].map((match) => match[1])].filter(Boolean);
}

function vocabularyDialogueQuestions(words, part, long = false) {
  const levelPool = [...vocab[1], ...vocab[2]];
  const shortOpeners = [
    "男：请你再说一次。", "男：我没听清楚。", "男：请说慢一点。", "男：你能再说一次吗？", "男：我想再听一次。",
    "男：请再说一遍。", "男：刚才说了什么？", "男：你再说一次吧。", "男：我想听清楚。", "男：请大声一点。",
  ];
  const longOpeners = [
    ["男：我在练习听力。", "女：你想听什么？", "男：请你说一个句子。"],
    ["女：我们一起学习汉语吧。", "男：好，我想练习听句子。", "女：那你认真听。"],
    ["男：这个问题我没听懂。", "女：我可以再说一次。", "男：好，请说慢一点。"],
    ["女：你准备好了吗？", "男：准备好了。", "女：那我说一个句子。"],
    ["男：今天我们练习什么？", "女：练习听句子。", "男：好，请开始吧。"],
  ];
  const usedAudio = new Set();
  return words.map((word, index) => {
    const questionText = "问：女的句子里有哪个词？";
    let body = long
      ? `${longOpeners[index % longOpeners.length].join("")}女：${word.example}`
      : `${shortOpeners[index % shortOpeners.length]}女：${word.example}`;
    let audioText = `${body}${questionText}`;
    while (usedAudio.has(audioText)) {
      body += "男：好的。";
      audioText = `${body}${questionText}`;
    }
    usedAudio.add(audioText);
    if (!wordForms(word).some((form) => word.example.includes(form))) throw new Error(`${word.id}: 例文に見出し語がありません`);
    const candidates = levelPool.filter((candidate) => candidate.id !== word.id && !wordForms(candidate).some((form) => audioText.includes(form)));
    const start = (index * 37) % candidates.length;
    const distractors = [candidates[start], candidates[(start + 71) % candidates.length]];
    if (!distractors.every(Boolean) || distractors[0].id === distractors[1].id) throw new Error(`${word.id}: 聴解の誤答を作れません`);
    const id = `hsk2-l${part}-v${String(index + 1).padStart(3, "0")}`;
    const toChoice = (item) => ({ value: item.id, label: item.hanzi, pinyin: item.pinyin });
    return q(id, "listening", part, long ? "audio-long-dialogue" : "audio-dialogue", {
      wordId: word.id,
      audioText,
      audioFile: audioFile(id),
      prompt: "女的句子里有哪个词？",
      choices: [word, ...distractors].map(toChoice),
      correct: word.id,
      instruction: long ? "请听较长对话，选择正确答案。" : "请听对话，选择正确答案。",
      explanation: `${word.example} — ${word.hanzi}（${word.pinyin}）`,
    });
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
  const reading = [...readingVisual(1, 15, 5, 1, true), ...readingVisual(1, 20, 5, 2), ...readingResponses(1, HSK1_RESPONSES, 3), ...authoredCloze(1, HSK1_CLOZE, 4)];
  return [...listening, ...reading];
}

function buildLevel2() {
  const levelWords = [...vocab[1], ...vocab[2]];
  const listening = [
    ...visualListening(2, 0, 10, 1, "judge"),
    ...visualListening(2, 10, 10, 2, "choice"),
    ...dialoguePool(2, [...DIALOGUES[2].slice(0, 10), ...HSK2_SHORT_DIALOGUES], 3),
    ...dialoguePool(2, [...DIALOGUES[2].slice(10, 15), ...HSK2_LONG_DIALOGUES], 4, true),
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
  const listening = [...listening1, ...listening2, ...dialoguePool(3, DIALOGUES[3], 3), ...listening4];
  const reading1 = readingResponses(3, HSK3_RESPONSES, 1);
  const reading2 = authoredCloze(3, HSK3_CLOZE, 2);
  const reading3 = HSK3_PASSAGES.map((item, index) => q(`hsk3-r3-${String(index + 1).padStart(2, "0")}`, "reading", 3, "reading-comprehension", { prompt: item[0], subPrompt: item[1], choices: choices(item[2], item[3], 3), correct: item[2], instruction: "请阅读短文，选择正确答案。", explanation: `${item[1]} — ${item[2]}` }));
  const reorder = HSK3_REORDER.map((item, index) => {
    const id = `hsk3-w1-${String(index + 1).padStart(2, "0")}`;
    return q(id, "writing", 1, "reorder", { tokens: item[0], answer: item[1], meaning: item[2], answerAudioFile: audioFile(`${id}-answer`), instruction: "请把下面的词语排列成正确的句子。", selected: [] });
  });
  const input = HSK3_INPUT.map((item, index) => {
    const id = `hsk3-w2-${String(index + 1).padStart(2, "0")}`;
    return q(id, "writing", 2, "input", { sentence: item[0], answer: item[1], meaning: item[2], answerAudioFile: audioFile(`${id}-answer`), instruction: "请根据拼音在空格上写汉字。" });
  });
  return [...listening, ...reading1, ...reading2, ...reading3, ...reorder, ...input];
}

const forms = { 1: buildLevel1(), 2: buildLevel2(), 3: buildLevel3() };
// HSK2の聴解は出題プール制。1回の模試で出す問数（questionSelection）と読解・作文の数を検査する。
const MOCK_SELECTION = { 2: { listening: { 1: 10, 2: 10, 3: 10, 4: 5 } }, 3: { listening: { 1: 10, 2: 10, 3: 10, 4: 10 } } };
const expected = { 1: { total: 40, listening: 20, reading: 20, writing: 0 }, 2: { listening: 35, reading: 25, writing: 0 }, 3: { total: 80, listening: 40, reading: 30, writing: 10 } };
for (const level of [1, 2, 3]) {
  const questions = forms[level];
  const counts = Object.fromEntries(["listening", "reading", "writing"].map((skill) => [skill, questions.filter((question) => question.skill === skill).length]));
  const selection = MOCK_SELECTION[level]?.listening;
  if (selection) {
    // プール制の級は、部分ごとに出題数以上そろっていること。
    for (const [part, count] of Object.entries(selection)) {
      const available = questions.filter((question) => question.skill === "listening" && question.part === Number(part)).length;
      if (available < count) throw new Error(`HSK ${level} 聴解第${part}部分: ${count}問必要ですが${available}問しかありません`);
    }
    if (counts.reading !== expected[level].reading || counts.writing !== expected[level].writing) throw new Error(`HSK ${level} count mismatch: ${JSON.stringify(counts)}`);
  } else if (questions.length !== expected[level].total || Object.entries(counts).some(([skill, count]) => count !== expected[level][skill])) {
    throw new Error(`HSK ${level} count mismatch: ${JSON.stringify(counts)}`);
  }
  if (new Set(questions.map((question) => question.id)).size !== questions.length) throw new Error(`HSK ${level}: duplicate ids`);
  const audio = questions.filter((question) => question.skill === "listening");
  const duplicateAudio = audio.filter((question, index) => audio.findIndex((item) => item.audioText === question.audioText) !== index);
  if (duplicateAudio.length) throw new Error(`HSK ${level}: duplicate listening prompts: ${duplicateAudio.map((question) => question.id).join(", ")}`);
  for (const item of audio) {
    const values = item.choices?.map((entry) => entry.value) || [];
    if (new Set(values).size !== values.length) throw new Error(`${item.id}: 聴解の選択肢が重複しています`);
    if (!values.includes(item.correct)) throw new Error(`${item.id}: 聴解の正解が選択肢にありません`);
  }
  // 似たような問題ばかりにならないよう、同じ部分の中で言い回しが近すぎる組を弾く。
  const bigrams = (text) => new Set(Array.from({ length: Math.max(0, text.length - 1) }, (_, index) => text.slice(index, index + 2)));
  const similarity = (a, b) => {
    const [left, right] = [bigrams(a), bigrams(b)];
    const shared = [...left].filter((gram) => right.has(gram)).length;
    return shared / Math.max(1, new Set([...left, ...right]).size);
  };
  for (const part of [1, 2, 3, 4]) {
    const items = questions.filter((question) => question.skill === "listening" && question.part === part && question.audioText);
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const score = similarity(items[i].audioText, items[j].audioText);
        if (score > 0.6) throw new Error(`${items[i].id} と ${items[j].id} の言い回しが近すぎます（類似度${score.toFixed(2)}）`);
      }
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
  }
  // 判断对错は、本文と★の文がそろっていて、正誤が偏っていないことを検査する。
  const judges = questions.filter((question) => question.kind === "reading-judge");
  for (const item of judges) {
    if (!item.subPrompt) throw new Error(`${item.id}: ★の文がありません`);
    if (item.prompt === item.subPrompt) throw new Error(`${item.id}: 本文と★の文が同じです`);
    if (!["true", "false"].includes(item.correct)) throw new Error(`${item.id}: 正解が对／不对ではありません`);
    if (level <= 2 && !(item.promptPinyin && item.subPromptPinyin)) throw new Error(`${item.id}: ピンインが足りません`);
  }
  if (judges.length && new Set(judges.map((item) => item.correct)).size < 2) throw new Error(`HSK ${level}: 判断对错の正解が片方に偏っています`);
  // 句子匹配は、選択肢がそろっていて級の範囲に収まっていることを検査する。
  for (const item of questions.filter((question) => question.kind === "reading-response")) {
    const labels = item.choices.map((entry) => entry.label);
    if (new Set(labels).size !== labels.length) throw new Error(`${item.id}: 選択肢が重複しています`);
    if (!labels.includes(item.correct)) throw new Error(`${item.id}: 正解が選択肢にありません`);
    if (level <= 2 && item.choices.some((entry) => !entry.pinyin)) console.warn(`  警告 ${item.id}: ピンインのない選択肢があります`);
  }
  // 技能・部分をまたいだ素材の使い回しと、級外の語彙を全問まとめて検査する。
  // HSK1・3は基準を満たしているのでエラー、HSK2の本文は整理が済むまで警告に留める。
  const strict = STRICT_VOCAB_LEVELS.has(level);
  const issues = [];
  const flag = (message) => { if (strict) issues.push(message); else console.warn(`  警告 ${message}`); };
  // 設問（「男的要做什么？」など）は本番でも同じ言い回しが繰り返されるので、素材だけを見る。
  const STEM_FIELD = { "audio-dialogue": "prompt", "audio-long-dialogue": "prompt", "reading-comprehension": "subPrompt" };
  const bodyText = (item) => ["audioText", "prompt", "subPrompt", "sentence", "answer"]
    .filter((field) => field !== STEM_FIELD[item.kind])
    .map((field) => (field === "audioText" ? String(item[field] || "").split("问：")[0] : item[field]))
    .filter(Boolean).map(String).join("").replace(/[男女问]：/g, "").replace(/[＿_]+/g, "").replace(/[。，、？！?!,.\s]/g, "");
  // 同じ言い回しが別の問題にも出ていないか（穴埋めの空欄や話者記号は外して比べる）。
  const owners = new Map();
  for (const item of questions) {
    const text = bodyText(item);
    for (const gram of new Set(Array.from({ length: Math.max(0, text.length - DUPLICATE_NGRAM + 1) }, (_, index) => text.slice(index, index + DUPLICATE_NGRAM)))) {
      if (!owners.has(gram)) owners.set(gram, new Set());
      owners.get(gram).add(item.id);
    }
  }
  const overlaps = new Map();
  for (const [gram, ids] of owners) {
    if (ids.size < 2) continue;
    const key = [...ids].sort().join(" × ");
    if (!overlaps.has(key) || overlaps.get(key).length < gram.length) overlaps.set(key, gram);
  }
  for (const [pair, gram] of overlaps) flag(`${pair}: 同じ言い回し「${gram}」を使い回しています`);
  // 本文・選択肢の語彙が級の範囲に収まっているか（判断对错の对／不对は出題形式なので除く）。
  for (const item of questions) {
    const texts = [item.audioText, item.prompt, item.subPrompt, item.sentence, item.answer,
      ...(item.choices || []).filter((entry) => !["true", "false"].includes(entry.value)).map((entry) => entry.label)]
      .filter(Boolean).map((text) => String(text).replace(/[男女问]：/g, ""));
    for (const text of texts) {
      for (const char of text) {
        if (/[一-鿿]/u.test(char) && !levelChars[level].has(char) && !PROPER_NOUN_CHARS.has(char)) flag(`${item.id}: HSK1〜${level}の語彙にない漢字「${char}」→ ${text}`);
      }
      for (const word of BLOCKED_WORDS) {
        if (text.includes(word)) flag(`${item.id}: HSK4以上の語「${word}」→ ${text}`);
      }
    }
  }
  // 同じ題材ばかりの模試にならないよう、場面を表す語が1回の受験で何問に出るかを数える。
  // プール制の部分は「出題数 ÷ 収録数」で割り引いて期待値にする。
  const weightOf = (item) => {
    const count = MOCK_SELECTION[level]?.[item.skill]?.[item.part];
    if (!count) return 1;
    const available = questions.filter((other) => other.skill === item.skill && other.part === item.part).length;
    return available ? count / available : 1;
  };
  const topicWords = allWords.filter((word) => (wordTags[word.id] || []).some((tag) => TOPIC_TAGS.has(tag)) && word.hanzi.length >= 2);
  const exposure = new Map();
  for (const item of questions) {
    const text = [item.audioText, item.prompt, item.subPrompt, item.sentence, item.answer].filter(Boolean).join("");
    for (const word of topicWords) {
      if (!text.includes(word.hanzi)) continue;
      exposure.set(word.hanzi, (exposure.get(word.hanzi) || 0) + weightOf(item));
    }
  }
  const crowded = [...exposure].filter(([, count]) => count > TOPIC_LIMIT).sort((left, right) => right[1] - left[1]);
  for (const [word, count] of crowded) console.warn(`  警告 HSK ${level}: 「${word}」が1回の模試で約${count.toFixed(1)}問に出ます（目安${TOPIC_LIMIT}問）`);

  if (issues.length) throw new Error(`HSK ${level} の作問に問題があります:\n  - ${issues.join("\n  - ")}`);

  const payload = {
    version: MOCK_SELECTION[level] ? 3 : 2,
    level,
    format: "HSK 2.0（日本実施形式）・写真問題は記号イラストで代替",
    generatedAt: new Date().toISOString(),
    ...(MOCK_SELECTION[level] ? { questionSelection: MOCK_SELECTION[level] } : {}),
    questions,
  };
  fs.writeFileSync(path.join(root, "data", `mock-hsk${level}.json`), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`HSK ${level}: ${questions.length}問（聴解${counts.listening}・読解${counts.reading}・作文${counts.writing}）`);
}
