import { Grade, ClearRank } from "../models/music-play";

export const gradeImages: Record<Grade, string> = {
  [Grade.EXPlus]: "https://wiki.arcaea.cn/images/thumb/f/fe/Play_result_grade_ex%2B.png/75px-Play_result_grade_ex%2B.png",
  [Grade.EX]: "https://wiki.arcaea.cn/images/thumb/c/c5/Play_result_grade_ex.png/75px-Play_result_grade_ex.png",
  [Grade.AA]: "https://wiki.arcaea.cn/images/thumb/c/c7/Play_result_grade_aa.png/75px-Play_result_grade_aa.png",
  [Grade.A]: "https://wiki.arcaea.cn/images/thumb/8/82/Play_result_grade_a.png/75px-Play_result_grade_a.png",
  [Grade.B]: "https://wiki.arcaea.cn/images/thumb/2/28/Play_result_grade_b.png/75px-Play_result_grade_b.png",
  [Grade.C]: "https://wiki.arcaea.cn/images/thumb/5/5e/Play_result_grade_c.png/75px-Play_result_grade_c.png",
  [Grade.D]: "https://wiki.arcaea.cn/images/thumb/1/18/Play_result_grade_d.png/75px-Play_result_grade_d.png",
};
export const clearImages: Record<ClearRank, string> = {
  [ClearRank.Maximum]: "https://wiki.arcaea.cn/images/thumb/a/a1/Play_result_clear_badge_pure.png/50px-Play_result_clear_badge_pure.png",
  [ClearRank.PureMemory]: "https://wiki.arcaea.cn/images/thumb/a/a1/Play_result_clear_badge_pure.png/50px-Play_result_clear_badge_pure.png",
  [ClearRank.FullRecall]: "https://wiki.arcaea.cn/images/thumb/1/11/Play_result_clear_badge_full.png/50px-Play_result_clear_badge_full.png",
  [ClearRank.HardClear]: "https://wiki.arcaea.cn/images/thumb/a/ac/Play_result_clear_badge_hard.png/50px-Play_result_clear_badge_hard.png",
  [ClearRank.NormalClear]: "https://wiki.arcaea.cn/images/thumb/1/15/Play_result_clear_badge_normal.png/50px-Play_result_clear_badge_normal.png",
  [ClearRank.EasyClear]: "https://wiki.arcaea.cn/images/thumb/c/cf/Play_result_clear_badge_easy.png/50px-Play_result_clear_badge_easy.png",
  [ClearRank.TrackLost]: "https://wiki.arcaea.cn/images/thumb/4/4c/Play_result_clear_badge_fail.png/50px-Play_result_clear_badge_fail.png",
};
