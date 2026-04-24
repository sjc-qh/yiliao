// src/config/trainingSteps.ts

interface TrainingStep {
  name: string;
  duration?: string;
  completed: boolean;
}

interface TrainingConfig {
  steps: TrainingStep[];
  precautions: string[];
}

export const trainingStepsConfig: Record<string, TrainingConfig> = {
  1: {
    steps: [
      { name: "下巴回收", completed: false },
      { name: "颈部四面抗阻", completed: false },
      { name: "开肩", completed: false },
      { name: "猫式伸展", completed: false },
      { name: "侧颈拉伸", completed: false },
      { name: "胸小肌拉伸", completed: false },
    ],
    precautions: [
      "训练时保持呼吸平稳,不要憋气",
      "动作应轻柔缓慢,不要勉强",
      "如感到疼痛应立即停止",
      "饭后30分钟内不宜训练",
    ]
  },
  2: {
    steps: [
      { name: "腹式呼吸", completed: false },
      { name: "骨盆后倾", completed: false },
      { name: "死虫式", completed: false },
      { name: "鸟狗式", completed: false },
      { name: "臀桥", completed: false },
      { name: "腘绳肌拉伸", completed: false },
      { name: "腰背部放松拉伸（婴儿式）", completed: false },
    ],
    precautions: [
      "训练时保持腰部稳定",
      "动作幅度不宜过大",
      "如有腰部疼痛应立即停止",
      "避免在过硬或过软的地面训练",
    ]
  },
  3: {
    steps: [
      { name: "靠墙天使", completed: false },
      { name: "肩胛后缩下沉", completed: false },
      { name: "侧卧外旋", completed: false },
      { name: "面拉姿势", completed: false },
      { name: "胸小肌拉伸", completed: false },
      { name: "肩后侧拉伸", completed: false },
      { name: "斜方肌上束放松", completed: false },
    ],
    precautions: [
      "训练时保持肩部放松",
      "动作应缓慢均匀",
      "如有肩部疼痛应立即停止",
      "避免过度用力",
    ]
  },
  4: {
    steps: [
      { name: "直腿抬高", completed: false },
      { name: "臀桥", completed: false },
      { name: "腘绳肌拉伸", completed: false },
      { name: "坐姿伸膝", completed: false },
      { name: "小腿拉伸", completed: false },
      { name: "股四头肌拉伸", completed: false },
      { name: "踝泵", completed: false },
    ],
    precautions: [
      "训练时保持膝关节稳定",
      "动作幅度应逐渐增加",
      "如有膝关节疼痛应立即停止",
      "避免在过硬的地面训练",
    ]
  },
  5: {
    steps: [
      { name: "踝泵", completed: false },
      { name: "直腿抬高", completed: false },
      { name: "腘绳肌等长收缩（大腿后侧）", completed: false },
      { name: "臀桥", completed: false },
      { name: "侧卧抬腿", completed: false },
      { name: "小腿拉伸", completed: false },
      { name: "股四头肌拉伸", completed: false },
    ],
    precautions: [
      "训练时避免膝关节扭转",
      "动作应轻柔缓慢",
      "如有疼痛应立即停止",
      "遵循医生建议的训练强度",
    ]
  },
  6: {
    steps: [
      { name: "踝泵", completed: false },
      { name: "直腿抬高", completed: false },
      { name: "坐姿伸膝", completed: false },
      { name: "臀桥", completed: false },
      { name: "侧卧抬腿", completed: false },
      { name: "蚌式开合", completed: false },
      { name: "小腿拉伸", completed: false },
      { name: "股四头肌拉伸", completed: false },
    ],
    precautions: [
      "训练时保持髌骨稳定",
      "动作应缓慢均匀",
      "如有疼痛应立即停止",
      "避免过度训练",
    ]
  },
  7: {
    steps: [
      { name: "踝泵", completed: false },
      { name: "直腿抬高", completed: false },
      { name: "腘绳肌等长收缩", completed: false },
      { name: "股四头肌等长收缩", completed: false },
      { name: "臀桥", completed: false },
      { name: "小腿拉伸", completed: false },
      { name: "股四头肌拉伸", completed: false },
    ],
    precautions: [
      "训练时避免膝关节过度屈曲",
      "动作应轻柔缓慢",
      "如有肿胀加重应立即停止",
      "遵循医生建议的训练强度",
    ]
  },
  8: {
    steps: [
      { name: "踝泵", completed: false },
      { name: "股四头肌等长收缩", completed: false },
      { name: "腘绳肌等长收缩", completed: false },
      { name: "直腿抬高", completed: false },
      { name: "臀桥", completed: false },
      { name: "侧卧抬腿", completed: false },
      { name: "小腿拉伸", completed: false },
      { name: "股四头肌拉伸", completed: false },
    ],
    precautions: [
      "训练时避免膝关节扭转",
      "动作应缓慢均匀",
      "如有疼痛应立即停止",
      "遵循康复师的指导",
    ]
  },
  9: {
    steps: [
      { name: "踝泵", completed: false },
      { name: "股四头肌等长收缩", completed: false },
      { name: "腘绳肌等长收缩", completed: false },
      { name: "直腿抬高", completed: false },
      { name: "坐姿伸膝", completed: false },
      { name: "臀桥", completed: false },
      { name: "侧卧抬腿", completed: false },
      { name: "小腿拉伸", completed: false },
      { name: "股四头肌拉伸", completed: false },
    ],
    precautions: [
      "训练时保持放松状态",
      "动作应轻柔缓慢",
      "如有疼痛应立即停止",
      "运动后及时补充水分",
    ]
  },
  10: {
    steps: [
      { name: "踝泵", completed: false },
      { name: "股四头肌等长收缩", completed: false },
      { name: "直腿抬高", completed: false },
      { name: "坐姿伸膝", completed: false },
      { name: "坐姿勾腿", completed: false },
      { name: "臀桥", completed: false },
      { name: "坐姿小腿拉伸", completed: false },
      { name: "坐姿大腿前侧拉伸", completed: false },
      { name: "坐姿膝关节屈伸", completed: false },
    ],
    precautions: [
      "训练时动作应缓慢",
      "避免过度用力",
      "如有不适应立即停止",
      "循序渐进增加训练强度",
    ]
  },
  11: {
    steps: [
      { name: "踝泵", completed: false },
      { name: "脚趾抓毛巾（激活足底肌肉）", completed: false },
      { name: "踝关节内翻等长收缩", completed: false },
      { name: "踝关节外翻等长收缩", completed: false },
      { name: "踝关节环绕活动", completed: false },
      { name: "提踵训练", completed: false },
      { name: "平衡训练", completed: false },
      { name: "小腿拉伸", completed: false },
    ],
    precautions: [
      "训练时避免踝关节扭转",
      "动作应轻柔缓慢",
      "如有疼痛应立即停止",
      "必要时使用护具保护",
    ]
  },
  12: {
    steps: [
      { name: "踝泵", completed: false },
      { name: "脚趾抓毛巾", completed: false },
      { name: "踝内翻等长收缩", completed: false },
      { name: "踝外翻等长收缩", completed: false },
      { name: "弹力带抗阻勾脚", completed: false },
      { name: "弹力带抗阻绷脚", completed: false },
      { name: "双侧提踵", completed: false },
      { name: "单脚提踵", completed: false },
      { name: "单脚站立平衡", completed: false },
      { name: "单脚睁眼/闭眼平衡", completed: false },
      { name: "小腿拉伸", completed: false },
    ],
    precautions: [
      "训练时确保周围环境安全",
      "动作应缓慢均匀",
      "如有不稳应立即停止",
      "循序渐进增加训练难度",
    ]
  },
  13: {
    steps: [
      { name: "脚趾抓毛巾", completed: false },
      { name: "脚趾张开训练", completed: false },
      { name: "足底筋膜放松（网球/筋膜球）", completed: false },
      { name: "小腿拉伸", completed: false },
      { name: "足底筋膜拉伸", completed: false },
      { name: "脚趾卷曲弹力带", completed: false },
      { name: "双脚提踵训练", completed: false },
      { name: "单脚平衡", completed: false },
    ],
    precautions: [
      "训练时保持足部放松",
      "动作应轻柔缓慢",
      "如有疼痛应立即停止",
      "选择合适的鞋子",
    ]
  },
  14: {
    steps: [
      { name: "足底滚球放松", completed: false },
      { name: "脚趾抓毛巾", completed: false },
      { name: "脚趾张开训练", completed: false },
      { name: "小腿拉伸", completed: false },
      { name: "足底筋膜拉伸", completed: false },
      { name: "双脚提踵", completed: false },
      { name: "单脚平衡", completed: false },
      { name: "跟腱拉伸", completed: false },
    ],
    precautions: [
      "训练时避免足跟过度负重",
      "动作应轻柔缓慢",
      "如有疼痛应立即停止",
      "选择合适的鞋子",
    ]
  },
  15: {
    steps: [
      { name: "脚趾抓毛巾", completed: false },
      { name: "脚趾张开训练", completed: false },
      { name: "短足训练（缩足）", completed: false },
      { name: "弹力带脚趾卷曲", completed: false },
      { name: "弹力带抗阻外翻", completed: false },
      { name: "双侧提踵", completed: false },
      { name: "单脚提踵", completed: false },
      { name: "单脚平衡", completed: false },
      { name: "小腿拉伸", completed: false },
    ],
    precautions: [
      "训练时保持足部稳定",
      "动作应缓慢均匀",
      "如有不适应立即停止",
      "选择合适的鞋子",
    ]
  },
  16: {
    steps: [
      { name: "足底滚球放松", completed: false },
      { name: "脚趾伸展拉伸", completed: false },
      { name: "小腿拉伸（直膝）", completed: false },
      { name: "跟腱拉伸（屈膝）", completed: false },
      { name: "脚趾张开训练", completed: false },
      { name: "毛巾拉伸足底", completed: false },
      { name: "提踵训练（双侧）", completed: false },
      { name: "单脚平衡训练", completed: false },
      { name: "踝关节环绕", completed: false },
    ],
    precautions: [
      "训练时保持足部放松",
      "动作应轻柔缓慢",
      "如有不适应立即停止",
      "选择合适的鞋子",
    ]
  },
  17: {
    steps: [
      { name: "腹式呼吸", completed: false },
      { name: "床上桥式运动", completed: false },
      { name: "自我关节被动活动", completed: false },
      { name: "双手交叉助力上举", completed: false },
      { name: "手指操", completed: false },
      { name: "坐姿平衡", completed: false },
      { name: "坐位重心左右转移", completed: false },
      { name: "坐位体前屈", completed: false },
      { name: "扶椅单脚站立", completed: false },
      { name: "扶椅原地踏步", completed: false },
    ],
    precautions: [
      "训练时有人陪同",
      "动作应缓慢均匀",
      "如有不适应立即停止",
      "遵循康复师的指导",
    ]
  },
  18: {
    steps: [
      { name: "腹式呼吸（放松+核心激活）", completed: false },
      { name: "床上桥式运动（核心+臀部）", completed: false },
      { name: "自我关节活动（肩/肘/腕/髋/膝/踝）", completed: false },
      { name: "双手交叉助力上举（上肢力量）", completed: false },
      { name: "手指操（灵活度+协调）", completed: false },
      { name: "坐姿平衡（不靠背）", completed: false },
      { name: "坐位重心左右转移", completed: false },
      { name: "坐位体前屈（下肢拉伸）", completed: false },
      { name: "扶椅单脚站立（平衡）", completed: false },
      { name: "扶椅原地踏步（步态基础）", completed: false },
      { name: "直线足跟接足尖走（协调）", completed: false },
    ],
    precautions: [
      "训练时有人陪同",
      "动作应缓慢均匀",
      "如有不适应立即停止",
      "遵循康复师的指导",
    ]
  },
  19: {
    steps: [
      { name: "腹式呼吸（核心激活）", completed: false },
      { name: "床上桥式运动（核心+臀肌）", completed: false },
      { name: "死虫式（深层核心）", completed: false },
      { name: "平板支撑（核心耐力）", completed: false },
      { name: "侧平板支撑（侧腰稳定）", completed: false },
      { name: "坐位平衡训练（长坐/椅坐）", completed: false },
      { name: "坐位重心左右转移", completed: false },
      { name: "坐位体前屈（腘绳肌拉伸）", completed: false },
      { name: "自我关节被动活动", completed: false },
      { name: "上肢助力上举", completed: false },
      { name: "手指操", completed: false },
    ],
    precautions: [
      "训练时有人陪同",
      "动作应轻柔缓慢",
      "如有不适应立即停止",
      "遵循康复师的指导",
    ]
  },
  20: {
    steps: [
      { name: "腹式呼吸（放松僵硬、激活核心）", completed: false },
      { name: "床上桥式运动（核心+臀部+腰背稳定）", completed: false },
      { name: "坐位躯干旋转（缓解躯干僵硬）", completed: false },
      { name: "坐位体前屈（放松腰背、大腿后侧）", completed: false },
      { name: "坐位平衡训练（核心稳定最重要）", completed: false },
      { name: "坐位重心左右转移", completed: false },
      { name: "扶椅原地高抬腿踏步（核心+步态启动）", completed: false },
      { name: "直线足跟接足尖走（改善小碎步）", completed: false },
      { name: "手指操（改善手部僵硬、动作迟缓）", completed: false },
      { name: "关节被动活动（自我拉伸）", completed: false },
    ],
    precautions: [
      "训练时有人陪同",
      "动作应缓慢均匀",
      "如有不适应立即停止",
      "遵循医生的建议",
    ]
  },
  21: {
    steps: [
      { name: "腹式呼吸", completed: false },
      { name: "床上桥式运动", completed: false },
      { name: "平板支撑", completed: false },
      { name: "侧平板支撑*", completed: false },
      { name: "坐位平衡（不靠背）", completed: false },
      { name: "坐位重心左右转移", completed: false },
      { name: "自我关节被动活动", completed: false },
      { name: "上肢助力上举", completed: false },
      { name: "手指操", completed: false },
      { name: "扶椅单脚站立", completed: false },
      { name: "扶椅原地踏步", completed: false },
    ],
    precautions: [
      "训练时有人陪同",
      "动作应轻柔缓慢",
      "如有不适应立即停止",
      "遵循康复师的指导",
    ]
  },
  22: {
    steps: [
      { name: "腹式呼吸（核心激活）", completed: false },
      { name: "床上桥式运动（核心+臀部）", completed: false },
      { name: "死虫式（深层核心，不伤脊柱）", completed: false },
      { name: "坐位平衡训练", completed: false },
      { name: "坐位重心左右转移", completed: false },
      { name: "坐位体前屈（拉伸放松）", completed: false },
      { name: "上肢助力上举（上肢骨折适用）", completed: false },
      { name: "自我关节被动活动", completed: false },
      { name: "手指操（消肿、防僵硬）", completed: false },
      { name: "扶椅原地踏步（下肢骨折恢复期）", completed: false },
    ],
    precautions: [
      "训练时遵循医生建议",
      "动作应轻柔缓慢",
      "如有疼痛应立即停止",
      "避免过度训练",
    ]
  },
  23: {
    steps: [
      { name: "腹式呼吸", completed: false },
      { name: "床上桥式运动", completed: false },
      { name: "死虫式", completed: false },
      { name: "坐位平衡", completed: false },
      { name: "坐位重心左右转移", completed: false },
      { name: "坐位体前屈", completed: false },
      { name: "自我关节被动活动", completed: false },
      { name: "上肢助力上举", completed: false },
      { name: "上肢助力上举", completed: false },
      { name: "扶椅原地踏步", completed: false },
    ],
    precautions: [
      "训练时遵循医生建议",
      "动作应轻柔缓慢",
      "如有疼痛应立即停止",
      "避免关节过度活动",
    ]
  },
  24: {
    steps: [
      { name: "腹式呼吸", completed: false },
      { name: "床上桥式", completed: false },
      { name: "坐姿躯干旋转", completed: false },
      { name: "坐位平衡", completed: false },
      { name: "重心左右转移", completed: false },
      { name: "坐位体前屈", completed: false },
      { name: "手指操", completed: false },
      { name: "关节活动", completed: false },
      { name: "扶椅踏步", completed: false },
      { name: "勾脚绷脚", completed: false },
    ],
    precautions: [
      "训练时保持关节稳定",
      "动作应轻柔缓慢",
      "如有疼痛应立即停止",
      "避免过度训练",
    ]
  },
  25: {
    steps: [
      { name: "腹式呼吸训练", completed: false },
      { name: "上肢轻摆训练", completed: false },
      { name: "原地慢踏步", completed: false },
      { name: "坐姿放松呼吸", completed: false },
      { name: "手部抓握训练", completed: false },
    ],
    precautions: [
      "训练时监测心率",
      "动作应缓慢均匀",
      "如有不适应立即停止",
      "遵循医生的建议",
    ]
  },
  26: {
    steps: [
      { name: "慢节奏腹式呼吸", completed: false },
      { name: "踝泵运动", completed: false },
      { name: "上肢微抬训练", completed: false },
      { name: "床边慢坐/慢走（后期）", completed: false },
      { name: "全身放松训练", completed: false },
    ],
    precautions: [
      "训练时监测心率",
      "动作应缓慢均匀",
      "如有不适应立即停止",
      "遵循医生的建议",
    ]
  },
  27: {
    steps: [
      { name: "缩唇呼吸训练", completed: false },
      { name: "轻量腹式呼吸", completed: false },
      { name: "手部小范围活动", completed: false },
      { name: "坐姿踝泵运动", completed: false },
      { name: "静坐放松调息", completed: false },
    ],
    precautions: [
      "训练时监测心率和呼吸",
      "动作应缓慢均匀",
      "如有不适应立即停止",
      "遵循医生的建议",
    ]
  },
  28: {
    steps: [
      { name: "缩唇呼吸训练", completed: false },
      { name: "腹式呼吸训练", completed: false },
      { name: "呼吸肌激活训练", completed: false },
      { name: "慢走配合呼吸", completed: false },
      { name: "上肢轻抬呼吸", completed: false },
    ],
    precautions: [
      "训练时监测呼吸",
      "动作应缓慢均匀",
      "如有不适应立即停止",
      "遵循医生的建议",
    ]
  },
  29: {
    steps: [
      { name: "腹式呼吸（护胸版）", completed: false },
      { name: "有效咳嗽训练", completed: false },
      { name: "上肢慢抬训练", completed: false },
      { name: "床边慢坐/慢走", completed: false },
      { name: "胸部放松揉按", completed: false },
    ],
    precautions: [
      "训练时监测呼吸",
      "动作应轻柔缓慢",
      "如有不适应立即停止",
      "遵循医生的建议",
    ]
  },
  30: {
    steps: [
      { name: "坐位抬腿", completed: false },
      { name: "靠墙静蹲", completed: false },
      { name: "握力训练", completed: false },
      { name: "坐位体前屈", completed: false },
    ],
    precautions: [
      "训练时有人陪同",
      "动作应缓慢均匀",
      "如有不适应立即停止",
      "循序渐进增加训练强度",
    ]
  },
  31: {
    steps: [
      { name: "单腿站立", completed: false },
      { name: "脚跟脚尖走", completed: false },
      { name: "侧步训练", completed: false },
      { name: "8字转体训练", completed: false },
    ],
    precautions: [
      "训练时有人陪同",
      "动作应缓慢均匀",
      "如有不稳应立即停止",
      "确保周围环境安全",
    ]
  },
  32: {
    steps: [
      { name: "被动勾脚（背伸）", completed: false },
      { name: "被动绷脚（跖屈）", completed: false },
      { name: "被动内翻/外翻", completed: false },
      { name: "床上桥式运动", completed: false },
      { name: "坐位平衡训练", completed: false },
      { name: "上肢助力训练", completed: false },
    ],
    precautions: [
      "训练时有人陪同",
      "动作应轻柔缓慢",
      "如有不适应立即停止",
      "遵循康复师的指导",
    ]
  },
  33: {
    steps: [
      { name: "数字图形记忆", completed: false },
      { name: "生活场景回忆", completed: false },
      { name: "手指操", completed: false },
      { name: "简单家务训练", completed: false },
    ],
    precautions: [
      "训练时有人陪同",
      "动作应缓慢均匀",
      "保持耐心和鼓励",
      "遵循康复师的指导",
    ]
  },
  34: {
    steps: [
      { name: "凯格尔运动", completed: false },
      { name: "臀桥", completed: false },
      { name: "腹式呼吸", completed: false },
      { name: "站姿收腹", completed: false },
      { name: "四点跪姿收腹", completed: false },
      { name: "死虫式", completed: false },
      { name: "靠墙站立", completed: false },
      { name: "猫式伸展", completed: false },
      { name: "蚌式开合", completed: false },
      { name: "深蹲", completed: false },
      { name: "弹力带划船", completed: false },
    ],
    precautions: [
      "训练时遵循医生建议",
      "动作应轻柔缓慢",
      "如有不适应立即停止",
      "循序渐进增加训练强度",
    ]
  },
  35: {
    steps: [
      { name: "低头/抬头", completed: false },
      { name: "左右侧屈", completed: false },
      { name: "左右旋转", completed: false },
      { name: "肩关节绕环", completed: false },
      { name: "扩胸夹背", completed: false },
      { name: "手臂上举拉伸", completed: false },
      { name: "肘关节屈伸", completed: false },
      { name: "腕关节绕环", completed: false },
      { name: "手腕屈伸", completed: false },
      { name: "髋关节绕环", completed: false },
      { name: "膝关节屈伸", completed: false },
      { name: "踝关节绕环", completed: false },
      { name: "弓步压腿", completed: false },
      { name: "猫式伸展", completed: false },
      { name: "脊柱扭转", completed: false },
    ],
    precautions: [
      "训练时保持关节放松",
      "动作应缓慢均匀",
      "如有疼痛应立即停止",
      "循序渐进增加活动范围",
    ]
  },
  36: {
    steps: [
      { name: "俯卧撑（跪姿/标准）", completed: false },
      { name: "哑铃/水瓶弯举", completed: false },
      { name: "俯身划船", completed: false },
      { name: "平板支撑", completed: false },
      { name: "卷腹", completed: false },
      { name: "俄罗斯转体", completed: false },
      { name: "深蹲", completed: false },
      { name: "弓步蹲", completed: false },
      { name: "提踵", completed: false },
      { name: "全身静态拉伸", completed: false },
      { name: "深呼吸调整", completed: false },
    ],
    precautions: [
      "训练时保持正确姿势",
      "动作应缓慢均匀",
      "如有不适应立即停止",
      "循序渐进增加训练强度",
    ]
  },
  37: {
    steps: [
      { name: "原地踏步", completed: false },
      { name: "足跟接足尖走（直线走）", completed: false },
      { name: "侧方移步（左右横移）", completed: false },
      { name: "单脚站立（睁眼）", completed: false },
      { name: "单脚站立（闭眼）", completed: false },
      { name: "足跟走路", completed: false },
      { name: "足尖走路", completed: false },
      { name: "八字步态练习", completed: false },
      { name: "站立左右重心转移", completed: false },
      { name: "小腿拉伸", completed: false },
    ],
    precautions: [
      "训练时有人陪同",
      "动作应缓慢均匀",
      "如有不稳应立即停止",
      "确保周围环境安全",
    ]
  },
  38: {
    steps: [
      { name: "腹式呼吸", completed: false },
      { name: "死虫式", completed: false },
      { name: "臀桥", completed: false },
      { name: "平板支撑", completed: false },
      { name: "侧平板支撑", completed: false },
    ],
    precautions: [
      "训练时保持正确姿势",
      "动作应缓慢均匀",
      "如有不适应立即停止",
      "循序渐进增加训练强度",
    ]
  },
  39: {
    steps: [
      { name: "颈部拉伸", completed: false },
      { name: "肩部拉伸", completed: false },
      { name: "胸部拉伸", completed: false },
      { name: "侧腰拉伸", completed: false },
      { name: "坐姿体前屈（腰背+大腿后侧）", completed: false },
      { name: "大腿前侧拉伸", completed: false },
      { name: "大腿内侧拉伸", completed: false },
      { name: "小腿拉伸", completed: false },
      { name: "腕关节拉伸", completed: false },
      { name: "手指拉伸", completed: false },
    ],
    precautions: [
      "训练时保持肌肉放松",
      "动作应轻柔缓慢",
      "如有疼痛应立即停止",
      "循序渐进增加拉伸幅度",
    ]
  },
  40: {
    steps: [
      { name: "功能重建与回归运动训练", completed: false },
      { name: "日常生活活动训练", completed: false },
      { name: "工作能力训练", completed: false },
      { name: "运动能力训练", completed: false },
      { name: "全身放松", completed: false },
    ],
    precautions: [
      "训练时有人陪同",
      "动作应缓慢均匀",
      "如有不适应立即停止",
      "遵循康复师的指导",
    ]
  }
};