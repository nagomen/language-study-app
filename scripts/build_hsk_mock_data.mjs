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

const HSK2_CLOZE_P4 = [
  ["老师说得很快，我没听＿＿＿，请再说一次。", "懂", ["完", "开"], "Lǎoshī shuō de hěn kuài, wǒ méi tīng ____, qǐng zài shuō yí cì."],
  ["我姐姐在医院工作，她是＿＿＿。", "医生", ["老师", "服务员"], "Wǒ jiějie zài yīyuàn gōngzuò, tā shì ____."],
  ["从我家到公司很＿＿＿，坐车要一个小时。", "远", ["近", "快"], "Cóng wǒ jiā dào gōngsī hěn ____, zuò chē yào yí ge xiǎoshí."],
  ["我今年二十岁，我哥哥二十二岁，他比我＿＿＿两岁。", "大", ["小", "高"], "Wǒ jīnnián èrshí suì, wǒ gēge èrshí'èr suì, tā bǐ wǒ ____ liǎng suì."],
  ["我的眼睛很累，因为我看了三个小时的＿＿＿。", "电视", ["牛奶", "房间"], "Wǒ de yǎnjing hěn lèi, yīnwèi wǒ kàn le sān ge xiǎoshí de ____."],
  ["时间不多了，我们＿＿＿走吧。", "快", ["慢", "再"], "Shíjiān bù duō le, wǒmen ____ zǒu ba."],
  ["明天是我妈妈的生日，我想＿＿＿她一件衣服。", "送", ["卖", "洗"], "Míngtiān shì wǒ māma de shēngrì, wǒ xiǎng ____ tā yí jiàn yīfu."],
  ["他生病了，所以今天在家＿＿＿。", "休息", ["运动", "跳舞"], "Tā shēngbìng le, suǒyǐ jīntiān zài jiā ____."],
  ["这个字我不会写，我想＿＿＿老师。", "问", ["告诉", "帮助"], "Zhège zì wǒ bú huì xiě, wǒ xiǎng ____ lǎoshī."],
  ["这些鸡蛋一公斤多少＿＿＿？", "钱", ["号", "次"], "Zhèxiē jīdàn yì gōngjīn duōshao ____?"],
];

const HSK3_CLOZE = [
  ["请把空调＿＿＿一下，房间里有点儿冷。", "关", ["搬", "借"]], ["明天有考试，今天晚上我要认真＿＿＿。", "复习", ["表演", "结婚"]],
  ["这个问题不难，我相信你一定能＿＿＿。", "解决", ["出现", "经过"]], ["旅行以前别忘了＿＿＿护照。", "带", ["选择", "提高"]],
  ["我家离公司很远，坐地铁比较＿＿＿。", "方便", ["安静", "新鲜"]], ["他每天坚持锻炼，身体越来越＿＿＿。", "健康", ["简单", "年轻"]],
  ["请你再说一遍，我没听＿＿＿。", "清楚", ["干净", "认真"]], ["除了汉语以外，她＿＿＿会说英语。", "还", ["才", "被"]],
  ["这条裤子太长了，那条比较＿＿＿。", "短", ["有名", "热情"]], ["比赛马上开始，请大家＿＿＿安全。", "注意", ["影响", "同意"]],
];

const HSK3_RESPONSES = [
  ["你觉得这个办法怎么样？", "我觉得可以试一试。", ["我昨天才到。", "他正在办公室。"]], ["会议什么时候结束？", "大概下午四点。", ["一共十个人。", "在银行旁边。"]],
  ["你的护照找到了吗？", "找到了，在包里。", ["我打算去旅游。", "这张照片很好。"]], ["能帮我搬一下箱子吗？", "当然，没问题。", ["箱子是蓝色的。", "我住在三层。"]],
  ["你怎么又迟到了？", "路上堵车了。", ["考试很简单。", "我已经吃饱了。"]], ["医生怎么说？", "他说我要多休息。", ["药在桌子上。", "医院离这儿很近。"]],
  ["你习惯这里的生活了吗？", "差不多已经习惯了。", ["我以前住在南方。", "这里有很多超市。"]], ["周末有什么打算？", "我想和朋友去爬山。", ["昨天刮风了。", "地图在包里。"]],
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
};

const READING_PROMPT_PINYIN = {
  "女的喝什么？": "Nǚ de hē shénme?", "现在几点？": "Xiànzài jǐ diǎn?", "女的去哪儿？": "Nǚ de qù nǎr?", "猫是谁的？": "Māo shì shéi de?", "女的会做饭吗？": "Nǚ de huì zuòfàn ma?",
};

function choice(label, level, extra = {}) {
  const pinyin = PINYIN[label] || byHanzi.get(label)?.pinyin;
  return { value: label, label, ...(level <= 2 && pinyin ? { pinyin } : {}), ...extra };
}
function choices(answer, distractors, level) { return [choice(answer, level), ...distractors.map((item) => choice(item, level))]; }
function q(id, skill, part, kind, fields) { return { id, skill, part, kind, ...fields }; }
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

function dialogueQuestions(level, start, count, part, long = false) {
  return DIALOGUES[level].slice(start, start + count).map((item, index) => {
    const id = `hsk${level}-l${part}-${String(index + 1).padStart(2, "0")}`;
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
  const reading = [...readingVisual(1, 0, 5, 1, true), ...readingVisual(1, 5, 5, 2), ...readingResponses(1, DIALOGUES[1].slice(0, 5).map((item) => [item[1], item[2], item[3]]), 3), ...authoredCloze(1, HSK1_CLOZE, 4)];
  return [...listening, ...reading];
}

function buildLevel2() {
  const listening = [...visualListening(2, 0, 10, 1, "judge"), ...visualListening(2, 10, 10, 2, "choice"), ...dialogueQuestions(2, 0, 10, 3), ...dialogueQuestions(2, 10, 5, 4, true)];
  const clozeWords = vocab[2].filter((word) => word.example?.includes(word.hanzi));
  const readingJudge = clozeWords.slice(12, 17).map((word, index) => {
    const other = index % 2 ? clozeWords[30 + index] : word;
    return q(`hsk2-r3-${String(index + 1).padStart(2, "0")}`, "reading", 3, "reading-judge", { prompt: word.example, promptPinyin: word.examplePinyin, subPrompt: other.example, subPromptPinyin: other.examplePinyin, choices: [choice("true", 2, { label: "对" }), choice("false", 2, { label: "不对" })], correct: String(index % 2 === 0), instruction: "请判断下面两句话的意思是否一致。", explanation: index % 2 === 0 ? "对" : "不对" });
  });
  const reading = [...readingVisual(2, 0, 5, 1), ...authoredCloze(2, HSK2_CLOZE_P2, 2), ...readingJudge, ...authoredCloze(2, HSK2_CLOZE_P4, 4)];
  return [...listening, ...reading];
}

function buildLevel3() {
  const listening1 = visualListening(3, 0, 10, 1, "choice");
  const listening2 = HSK3_STATEMENTS.map((item, index) => {
    const id = `hsk3-l2-${String(index + 1).padStart(2, "0")}`;
    return q(id, "listening", 2, "audio-judge", { audioText: item[0], audioFile: audioFile(id), prompt: item[1], choices: [choice("true", 3, { label: "对" }), choice("false", 3, { label: "不对" })], correct: String(item[2]), instruction: "请听录音，判断内容是否与句子一致。", explanation: item[2] ? "对" : "不对" });
  });
  const listening = [...listening1, ...listening2, ...dialogueQuestions(3, 0, 10, 3), ...dialogueQuestions(3, 10, 10, 4, true)];
  const reading1 = readingResponses(3, HSK3_RESPONSES, 1);
  const reading2 = authoredCloze(3, HSK3_CLOZE, 2);
  const reading3 = DIALOGUES[3].slice(10, 20).map((item, index) => q(`hsk3-r3-${String(index + 1).padStart(2, "0")}`, "reading", 3, "reading-comprehension", { prompt: item[0].replace(/问：.*$/, ""), subPrompt: item[1], choices: choices(item[2], item[3], 3), correct: item[2], instruction: "请阅读短文，选择正确答案。", explanation: `${item[1]} — ${item[2]}` }));
  const reorder = [
    [["我", "每天", "学习", "汉语"], "我每天学习汉语。"], [["他", "正在", "看", "报纸"], "他正在看报纸。"], [["明天", "可能", "下雨"], "明天可能下雨。"], [["我家", "离", "学校", "很近"], "我家离学校很近。"], [["她", "比", "我", "高"], "她比我高。"],
  ].map((item, index) => q(`hsk3-w1-${String(index + 1).padStart(2, "0")}`, "writing", 1, "reorder", { tokens: item[0], answer: item[1], instruction: "请把下面的词语排列成正确的句子。", selected: [] }));
  const input = [["我每天七点（qǐ）床。", "起"], ["今天天气很（rè）。", "热"], ["请喝一（bēi）茶。", "杯"], ["她今年二十（suì）。", "岁"], ["我们坐公共汽（chē）去。", "车"]].map((item, index) => q(`hsk3-w2-${String(index + 1).padStart(2, "0")}`, "writing", 2, "input", { sentence: item[0], answer: item[1], instruction: "请根据拼音在空格上写汉字。" }));
  return [...listening, ...reading1, ...reading2, ...reading3, ...reorder, ...input];
}

const forms = { 1: buildLevel1(), 2: buildLevel2(), 3: buildLevel3() };
const expected = { 1: { total: 40, listening: 20, reading: 20, writing: 0 }, 2: { total: 60, listening: 35, reading: 25, writing: 0 }, 3: { total: 80, listening: 40, reading: 30, writing: 10 } };
for (const level of [1, 2, 3]) {
  const questions = forms[level];
  const counts = Object.fromEntries(["listening", "reading", "writing"].map((skill) => [skill, questions.filter((question) => question.skill === skill).length]));
  if (questions.length !== expected[level].total || Object.entries(counts).some(([skill, count]) => count !== expected[level][skill])) throw new Error(`HSK ${level} count mismatch: ${JSON.stringify(counts)}`);
  if (new Set(questions.map((question) => question.id)).size !== questions.length) throw new Error(`HSK ${level}: duplicate ids`);
  const audio = questions.filter((question) => question.skill === "listening");
  if (new Set(audio.map((question) => question.audioText)).size !== audio.length) throw new Error(`HSK ${level}: duplicate listening prompts`);
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
  const payload = { version: 2, level, format: "HSK 2.0（日本実施形式）・写真問題は記号イラストで代替", generatedAt: new Date().toISOString(), questions };
  fs.writeFileSync(path.join(root, "data", `mock-hsk${level}.json`), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`HSK ${level}: ${questions.length}問（聴解${counts.listening}・読解${counts.reading}・作文${counts.writing}）`);
}
