// API端参数列表(JSON Schema格式)
export const paramsForApis = [
    // 美图智能API
    {
        "type": "function",
        "function": {
            "name": "meituauto",
            "description": "当你想对图片作出调整时非常有用。能够提供如下效果：暗图矫正（改善图片角落/周围的暗色部分）、智能调节白平衡（改善发黄或发蓝的图像）、智能调节曝光（改善过亮或过暗的图像）、智能去雾（去除图片中灰蒙蒙的感觉）、智能美颜（让人更好看）、智能修复（改善照片中的模糊、低分辨率或老旧照片）。所有参数请尽可能给的保守一些，数值非必要不用给太高。",
            "parameters": {
                "type": "object",
                "properties": {
                    "bright_low_dark_image_flag": {
                        "type": "integer",
                        "enum": [0, 1],
                        "description": "用于改善图片角落/周围的暗色部分，暗图纠正。"
                    },
                    "awb_norm_coef": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "改善发黄或发蓝的图像，智能白平衡调节。"
                    },
                    "exposure_norm_coef": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "改善过亮或过暗的图像，智能曝光调节。"
                    },
                    "dehaze_coef": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "去除图片中灰蒙蒙的感觉，智能去雾。"
                    },
                    "face_beauty_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "让人更好看，智能美颜。"
                    },
                    "face_restore_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "改善模糊、低分辨率或老旧照片，智能修复。"
                    },
                    // ... (other properties following the same pattern)

                    "exposure": {
                        "type": "integer",
                        "minimum": -500,
                        "maximum": 500,
                        "description": "控制图片的整体亮度，明暗程度调整。"
                    },
                    "sharpness": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "增强或减弱图片细节锐利度，清晰度调节。"
                    },
                    "constrast": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "增强或减弱图片明暗对比，对比度调节。"
                    },
                    "vibrance": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "智能增强色彩而不至于过度饱和，自然饱和度调整。"
                    },
                    "shadow": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "提升或降低阴影区域亮度，改善暗部细节。"
                    },
                    "temperature": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "调整图片冷暖色调，色温调节。"
                    },
                    "hue": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "改变图片色彩倾向，创造不同氛围效果。"
                    },
                    "saturability": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "增强或减少颜色强度，饱和度调节。"
                    },
                    "highlight": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "控制最亮部分亮度，避免过曝，高光调节。"
                    },
                    "blackness": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "加深黑色部分，增加对比度，黑色增强。"
                    },
                    "whiteness": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "优化白色纯净度，使白色更干净明亮。"
                    },
                    "skin_hdr_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "增强皮肤的光影层次和透明感，皮肤透亮系数。"
                    },
                    "skin_white_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "所有美白有关，美白系数。"
                    },
                    "skin_red_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "增加皮肤的健康红润感，皮肤红润系数。"
                    },
                    "body_dullness_remove_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "消除身体不同部位肤色差异，使肤色均匀，肤色统一系数。"
                    },
                    "multibody_beauty": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 150,
                        "description": "针对照片进行身形美化，美型（可以多人液化）系数。"
                    },
                    "skin_fleck_clean_flag": {
                        "type": "integer",
                        "enum": [0, 1],
                        "description": "开启或关闭身体上的斑点和痘痘去除，祛斑祛痘_身体标志。"
                    },
                    "flaw_clean_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "减少身体表面的瑕疵，身体去瑕疵系数。"
                    },
                    "fluffy_hair": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "让头发看起来更加蓬松自然，头发蓬松系数。"
                    },
                    "white_teeth": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "增强牙齿的洁白度，牙齿美白系数。"
                    },
                    "teeth_beauty": {
                        "type": "integer",
                        "enum": [0, 1],
                        "description": "修复牙齿的缺陷，如裂痕或色素沉着，牙齿修复系数。"
                    },
                    "heighten": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "拉长腿部或整体身高，使人物显得更高挑，AI增高系数。"
                    },
                    "black_hair": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "头发变黑"
                    },
                    "filter": {
                        "type": "object",
                        "description": "应用图像滤镜设置，为图片增添独特风格。选择以下滤镜之一，每个滤镜都有其特定的视觉效果：\n\n- **寂忆 (FakN7AwtNBuTbbAg)**：营造怀旧淡雅的氛围，适合回忆主题。\n- **高级灰 (Fa00006fhJ3N39BW)**：采用低饱和度的灰色调，展现低调奢华感。\n- **复古 (Fa0000GIqjw2lTHs)**：模拟老照片的暖色调，带出时间的痕迹。\n- **多彩 (Fa5Ko6DFZ0M7LYq0)**：增强色彩活力，让画面鲜艳夺目。\n- **静谧 (FaSIJM59R7eIQNdb)**：营造宁静和谐的色调，适合安静场景。\n- **清冷 (FaTrSSLhNVNl7fez)**：冷色调滤镜，给人清新凉爽的感觉。\n- **园林 (Fa0000RGuP61MarE)**：模拟自然园林的绿色调，适合户外风景。\n- **东方 (Fa0000zZmwsM7Nfl)**：融合东方美学的色彩处理，展现古典韵味。\n- **极简 (Fa0000l4c2ZRdh74)**：简化色彩，强调线条和形状，适合现代简约风格。\n- **抹茶 (Fa9EFqwgJB9SwW8d)**：以抹茶绿为主调，传递自然与清新的气息。\n- **藕色 (Fa0000qhjvzrB6bk)**：柔和的藕色调，适合温馨柔和的场景。\n- **旧梦 (FaFgP87DcDJGi4mI)**：营造梦境般的朦胧效果，带有一丝复古味道。\n- **青葱 (FaGt8R0xGCprQFOs)**：强调绿色，适合生机勃勃的自然景象。\n- **淅沥 (Fai455PvRjZLgUas)**：模拟雨后清新，带有轻微的冷色调和高对比度。\n- **宫廷 (Fa0000ka4QT8K4qu)**：华丽的色彩处理，适合展现奢华宫廷风。",
                        "properties": {
                            "filter_id": {
                                "type": "string",
                                "description": "选择滤镜的ID。",
                                "enum": [
                                    "FakN7AwtNBuTbbAg", // 寂忆
                                    "Fa00006fhJ3N39BW", // 高级灰
                                    "Fa0000GIqjw2lTHs", // 复古
                                    "Fa5Ko6DFZ0M7LYq0", // 多彩
                                    "FaSIJM59R7eIQNdb", // 静谧
                                    "FaTrSSLhNVNl7fez", // 清冷
                                    "Fa0000RGuP61MarE", // 园林
                                    "Fa0000zZmwsM7Nfl", // 东方
                                    "Fa0000l4c2ZRdh74", // 极简
                                    "Fa9EFqwgJB9SwW8d", // 抹茶
                                    "Fa0000qhjvzrB6bk", // 藕色
                                    "FaFgP87DcDJGi4mI", // 旧梦
                                    "FaGt8R0xGCprQFOs", // 青葱
                                    "Fai455PvRjZLgUas", // 淅沥
                                    "Fa0000ka4QT8K4qu"  // 宫廷
                                ],
                            },
                            "filters_lut_alpha": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 100,
                                "description": "调节滤镜效果强度，范围0-100。",
                                "default": 50
                            },
                            "filter_is_black": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 1,
                                "description": "是否应用黑白滤镜效果，0为否，1为是。",
                                "default": 0
                            }
                        },
                        "required": ["filter_id", "filters_lut_alpha", "filter_is_black"]
                    },

                    // 以下为20240630新增参数_2
                    "hsl_sat_red": {
                        "type": "integer",
                        "description": "偏红减少，红太淡增加",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_sat_orange": {
                        "type": "integer",
                        "description": "偏橙减少，橙太淡增加",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_sat_yellow": {
                        "type": "integer",
                        "description": "偏黄减少，黄太淡增加",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_sat_green": {
                        "type": "integer",
                        "description": "偏绿减少，绿太淡增加",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_sat_aqua": {
                        "type": "integer",
                        "description": "偏浅绿减少，浅绿太淡增加",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_sat_blue": {
                        "type": "integer",
                        "description": "偏蓝减少，蓝太淡增加",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_sat_violet": {
                        "type": "integer",
                        "description": "偏紫减少，紫太淡增加用",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_sat_magenta": {
                        "type": "integer",
                        "description": "偏粉减少，粉太淡增加",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_hue_red": {
                        "type": "integer",
                        "description": "色相_红色，仅风格化使用，色彩偏差",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_hue_orange": {
                        "type": "integer",
                        "description": "色相_橙色，仅风格化使用，色彩偏差",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_hue_yellow": {
                        "type": "integer",
                        "description": "色相_黄色，仅风格化使用，色彩偏差",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_hue_green": {
                        "type": "integer",
                        "description": "色相_绿色，仅风格化使用，色彩偏差",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_hue_aqua": {
                        "type": "integer",
                        "description": "色相_浅绿，仅风格化使用，色彩偏差",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_hue_blue": {
                        "type": "integer",
                        "description": "色相_蓝色，仅风格化使用，色彩偏差",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_hue_violet": {
                        "type": "integer",
                        "description": "色相_紫罗兰，仅风格化使用，色彩偏差",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_hue_magenta": {
                        "type": "integer",
                        "description": "色相_品红，仅风格化使用，色彩偏差",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_red": {
                        "type": "integer",
                        "description": "明亮度_红色，调整明暗度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_orange": {
                        "type": "integer",
                        "description": "明亮度_橙色，调整明暗度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_yellow": {
                        "type": "integer",
                        "description": "明亮度_黄色，调整明暗度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_green": {
                        "type": "integer",
                        "description": "明亮度_绿色，调整明暗度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_aqua": {
                        "type": "integer",
                        "description": "明亮度_浅绿，调整明暗度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_blue": {
                        "type": "integer",
                        "description": "明亮度_蓝色，调整明暗度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_violet": {
                        "type": "integer",
                        "description": "明亮度_紫罗兰，调整明暗度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_magenta": {
                        "type": "integer",
                        "description": "明亮度_品红，调整明暗度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "ai_shrink_head": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "default": 0,
                        "description": "控制脸部缩头"
                    },
                    "face_forehead": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "控制脸部额头"
                    },
                    "middle_half_of_face": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "控制脸部中庭"
                    },
                    "bottom_half_of_face": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "控制脸部下庭"
                    },
                    "philtrum_warp": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "控制脸部人中"
                    },
                    "narrow_face": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "瘦脸。控制脸部脸宽，瘦脸是负值，宽脸是正值，尽量大一些"
                    },
                    "cheekbone_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "控制脸部颧骨_左"
                    },
                    "cheekbone_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "控制脸部颧骨_右"
                    },
                    "temple_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "控制脸部太阳穴_左"
                    },
                    "temple_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "控制脸部太阳穴_右"
                    },
                    "mandible_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "控制脸部下颌_左"
                    },
                    "mandible_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "控制脸部下颌_右"
                    },
                    "jaw_trans": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "控制脸部下巴高度"
                    },
                    "face_trans": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "控制脸部下巴宽度"
                    },
                    "nasal_tip": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "鼻子_鼻尖调整"
                    },
                    "bridge_nose": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "鼻子_鼻梁调整"
                    },
                    "shrink_nose": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "鼻子_鼻翼调整"
                    },
                    "scale_nose": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "鼻子_大小调整"
                    },
                    "nose_longer": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "鼻子_长短调整"
                    },
                    "nasal_root": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "鼻子_山根调整"
                    },
                    "upperlip_enhance": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "嘴巴_丰上唇调整"
                    },
                    "lowerlip_enhance": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "嘴巴_丰下唇调整"
                    },
                    "mouth_trans": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "嘴巴_大小调整"
                    },
                    "mouth_high": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "嘴巴_高度调整"
                    },
                    "mouth_breadth": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "嘴巴_宽度调整"
                    },
                    "high_mouth": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "嘴巴_上下调整"
                    },
                    "mouth_smile": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "嘴巴_微笑调整"
                    },
                    "eye_up_down_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_左_上下调整"
                    },
                    "eye_up_down_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_右_上下调整"
                    },
                    "eye_trans_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_左_大小调整"
                    },
                    "eye_trans_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_右_大小调整"
                    },
                    "eye_tilt_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_左_倾斜调整"
                    },
                    "eye_tilt_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_右_倾斜调整"
                    },
                    "eye_height_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_左_眼高调整"
                    },
                    "eye_height_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_右_眼高调整"
                    },
                    "eye_lid_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_左_眼睑调整"
                    },
                    "eye_lid_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_右_眼睑调整"
                    },
                    "eye_distance_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_左_眼距调整"
                    },
                    "eye_distance_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_右_眼距调整"
                    },
                    "eye_width_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_左_眼宽调整"
                    },
                    "eye_width_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_右_眼宽调整"
                    },
                    "inner_eye_corner_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_左_开眼角调整"
                    },
                    "inner_eye_corner_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眼睛_右_开眼角调整"
                    },
                    "eyebrow_tilt_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眉毛_左_倾斜调整"
                    },
                    "eyebrow_tilt_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眉毛_右_倾斜调整"
                    },
                    "eyebrow_height_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眉毛_左_上下调整"
                    },
                    "eyebrow_height_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眉毛_右_上下调整"
                    },
                    "eyebrow_distance_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眉毛_左_间距调整"
                    },
                    "eyebrow_distance_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眉毛_右_间距调整"
                    },
                    "eyebrow_ridge_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眉毛_左_眉峰调整"
                    },
                    "eyebrow_ridge_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眉毛_右_眉峰调整"
                    },
                    "eyebrow_size_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眉毛_左_粗细调整"
                    },
                    "eyebrow_size_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "default": 0,
                        "description": "眉毛_右_粗细调整"
                    },
                    "beauty_belly_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 1,
                        "default": 0,
                        "description": "身体优化_祛妊娠纹"
                    },
                    "baby_remove_dander": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "default": 0,
                        "description": "身体优化_婴幼儿去瑕疵"
                    },
                    "rmw_rink": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "default": 0,
                        "description": "衣服祛褶皱"
                    },



                }
            },
            "required": []
        }
    },

    // 在此添加第二第三个工具
]