// API端参数列表(JSON Schema格式)
export const paramsForApis = [
    // 美图智能API
    {
        "type": "function",
        "function": {
            "name": "meituauto",
            "description": "当你想对图片作出调整时非常有用。所有参数请尽可能给的保守一些，数值非必要不用给太高。",
            "parameters": {
                "type": "object",
                "properties": {
                    "bright_low_dark_image_flag": {
                        "type": "integer",
                        "enum": [0, 1],
                        "description": "暗角修正"
                    },
                    "awb_norm_coef": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "白平衡修正"
                    },
                    "exposure_norm_coef": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "曝光修正"
                    },
                    "dehaze_coef": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "智能去雾"
                    },
                    "face_beauty_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "智能美颜"
                    },
                    "face_restore_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "智能修复"
                    },
                    "exposure": {
                        "type": "integer",
                        "minimum": -500,
                        "maximum": 500,
                        "description": "曝光/亮度"
                    },
                    "sharpness": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "清晰度"
                    },
                    "constrast": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "对比度"
                    },
                    "vibrance": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "自然饱和度"
                    },
                    "shadow": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "暗部"
                    },
                    "temperature": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "色温"
                    },
                    // "hue": {
                    //     "type": "integer",
                    //     "minimum": -100,
                    //     "maximum": 100,
                    //     "description": "色相"
                    // },
                    "saturability": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "饱和度"
                    },
                    "highlight": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "高光"
                    },
                    "blackness": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "黑色"
                    },
                    "whiteness": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "白色"
                    },
                    "skin_hdr_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "皮肤透亮"
                    },
                    "skin_white_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "皮肤美白"
                    },
                    "skin_red_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "皮肤红润"
                    },
                    "body_dullness_remove_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "肤色均匀"
                    },
                    "multibody_beauty": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 150,
                        "description": "美型(可多人)"
                    },
                    "skin_fleck_clean_flag": {
                        "type": "integer",
                        "enum": [0, 1],
                        "description": "祛斑祛痘"
                    },
                    "flaw_clean_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "身体去瑕疵"
                    },
                    "fluffy_hair": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "头发蓬松"
                    },
                    "white_teeth": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "牙齿美白"
                    },
                    "teeth_beauty": {
                        "type": "integer",
                        "enum": [0, 1],
                        "description": "牙齿修复"
                    },
                    "heighten": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "智能增高"
                    },
                    "black_hair": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "发色增黑"
                    },
                    "smooth_face_skin_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "脸部磨皮"
                    },
                    "smooth_not_face_skin_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "身体磨皮"
                    },
                    "fleck_clean_flag": {
                        "type": "integer",
                        "enum": [0, 1],
                        "description": "去除斑祛痘"
                    },
                    "lip_remove_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "去除唇纹"
                    },
                    "wrinkle_nasolabial_removal_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "去除法令纹"
                    },
                    "black_head_clean_flag": {
                        "type": "integer",
                        "enum": [0, 1],
                        "description": "去除黑头/脂肪粒"
                    },
                    "remove_pouch": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "去除黑眼圈"
                    },
                    "wrinkle_neck_removal_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "去除颈纹"
                    },
                    "wrinkle_cheek_removal_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "去除面颊纹"
                    },
                    "double_chin": {
                        "type": "integer",
                        "enum": [0, 1],
                        "description": "去除双下巴"
                    },
                    "wrinkle_forehead_removal_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "去除抬头纹"
                    },
                    "wrinkle_periorbital_removal_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "去除眼周纹"
                    },
                    "shiny_clean_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "去除油光"
                    },
                    "nevus_removal_flag": {
                        "type": "integer",
                        "enum": [0, 1],
                        "description": "去除痣_脸部"
                    },
                    "filter": {
                        "type": "object",
                        "description": "调整画面效果时必选。选择以下滤镜之一，每个滤镜都有其特定的视觉效果：\n\n- **寂忆 (FakN7AwtNBuTbbAg)**：营造怀旧淡雅的氛围，适合回忆主题。\n- **高级灰 (Fa00006fhJ3N39BW)**：采用低饱和度的灰色调，展现低调奢华感。\n- **复古 (Fa0000GIqjw2lTHs)**：模拟老照片的暖色调，带出时间的痕迹。\n- **多彩 (Fa5Ko6DFZ0M7LYq0)**：增强色彩活力，让画面鲜艳夺目。\n- **静谧 (FaSIJM59R7eIQNdb)**：营造宁静和谐的色调，适合安静场景。\n- **清冷 (FaTrSSLhNVNl7fez)**：冷色调滤镜，给人清新凉爽的感觉。\n- **园林 (Fa0000RGuP61MarE)**：模拟自然园林的绿色调，适合户外风景。\n- **东方 (Fa0000zZmwsM7Nfl)**：融合东方美学的色彩处理，展现古典韵味。\n- **极简 (Fa0000l4c2ZRdh74)**：简化色彩，强调线条和形状，适合现代简约风格。\n- **抹茶 (Fa9EFqwgJB9SwW8d)**：以抹茶绿为主调，传递自然与清新的气息。\n- **藕色 (Fa0000qhjvzrB6bk)**：柔和的藕色调，适合温馨柔和的场景。\n- **旧梦 (FaFgP87DcDJGi4mI)**：营造梦境般的朦胧效果，带有一丝复古味道。\n- **青葱 (FaGt8R0xGCprQFOs)**：强调绿色，适合生机勃勃的自然景象。\n- **淅沥 (Fai455PvRjZLgUas)**：模拟雨后清新，带有轻微的冷色调和高对比度。\n- **宫廷 (Fa0000ka4QT8K4qu)**：华丽的色彩处理，适合展现奢华宫廷风。",
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
                                "description": "滤镜强度",
                                "default": 50
                            },
                            "filter_is_black": {
                                "type": "integer",
                                "enum": [0, 1],
                                "description": "应用黑白滤镜",
                                "default": 0
                            }
                        },
                        "required": ["filter_id", "filters_lut_alpha", "filter_is_black"]
                    },

                    // 以下为20240630新增参数_2
                    "hsl_sat_red": {
                        "type": "integer",
                        "description": "HSL: 红色饱和度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_sat_orange": {
                        "type": "integer",
                        "description": "HSL: 橙色饱和度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_sat_yellow": {
                        "type": "integer",
                        "description": "HSL: 黄色饱和度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_sat_green": {
                        "type": "integer",
                        "description": "HSL: 绿色饱和度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_sat_aqua": {
                        "type": "integer",
                        "description": "HSL: 浅绿色饱和度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_sat_blue": {
                        "type": "integer",
                        "description": "HSL: 蓝色饱和度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_sat_violet": {
                        "type": "integer",
                        "description": "HSL: 紫色饱和度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_sat_magenta": {
                        "type": "integer",
                        "description": "HSL: 粉色饱和度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    // "hsl_hue_red": {
                    //     "type": "integer",
                    //     "description": "色相_红色，仅风格化使用，色彩偏差",
                    //     "minimum": -100,
                    //     "maximum": 100
                    // },
                    // "hsl_hue_orange": {
                    //     "type": "integer",
                    //     "description": "色相_橙色，仅风格化使用，色彩偏差",
                    //     "minimum": -100,
                    //     "maximum": 100
                    // },
                    // "hsl_hue_yellow": {
                    //     "type": "integer",
                    //     "description": "色相_黄色，仅风格化使用，色彩偏差",
                    //     "minimum": -100,
                    //     "maximum": 100
                    // },
                    // "hsl_hue_green": {
                    //     "type": "integer",
                    //     "description": "色相_绿色，仅风格化使用，色彩偏差",
                    //     "minimum": -100,
                    //     "maximum": 100
                    // },
                    // "hsl_hue_aqua": {
                    //     "type": "integer",
                    //     "description": "色相_浅绿，仅风格化使用，色彩偏差",
                    //     "minimum": -100,
                    //     "maximum": 100
                    // },
                    // "hsl_hue_blue": {
                    //     "type": "integer",
                    //     "description": "色相_蓝色，仅风格化使用，色彩偏差",
                    //     "minimum": -100,
                    //     "maximum": 100
                    // },
                    // "hsl_hue_violet": {
                    //     "type": "integer",
                    //     "description": "色相_紫罗兰，仅风格化使用，色彩偏差",
                    //     "minimum": -100,
                    //     "maximum": 100
                    // },
                    // "hsl_hue_magenta": {
                    //     "type": "integer",
                    //     "description": "色相_品红，仅风格化使用，色彩偏差",
                    //     "minimum": -100,
                    //     "maximum": 100
                    // },
                    "hsl_luma_red": {
                        "type": "integer",
                        "description": "HSL: 红色明亮度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_orange": {
                        "type": "integer",
                        "description": "HSL: 橙色明亮度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_yellow": {
                        "type": "integer",
                        "description": "HSL: 黄色明亮度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_green": {
                        "type": "integer",
                        "description": "HSL: 绿色明亮度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_aqua": {
                        "type": "integer",
                        "description": "HSL: 浅绿色明亮度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_blue": {
                        "type": "integer",
                        "description": "HSL: 蓝色明亮度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_violet": {
                        "type": "integer",
                        "description": "HSL: 紫罗兰色明亮度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "hsl_luma_magenta": {
                        "type": "integer",
                        "description": "HSL: 品红色明亮度",
                        "minimum": -100,
                        "maximum": 100
                    },
                    "lipstick_deepen": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,

                        "description": "唇妆增强"
                    },
                    "highlight_alpha": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,

                        "description": "高光立体"
                    },
                    "facial_deepen": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,

                        "description": "脸颊加深"
                    },
                    "bright_eye": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,

                        "description": "亮眼"
                    },
                    "eyebrow_deepen": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,

                        "description": "眉毛增强"
                    },
                    "eyeshadow_deepen": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,

                        "description": "眼妆增强"
                    },
                    "shadow_light": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,

                        "description": "阴影立体"
                    },
                    "ai_shrink_head": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,

                        "description": "头部缩小"
                    },
                    "face_forehead": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "额头大小"
                    },
                    "middle_half_of_face": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "脸部中庭大小"
                    },
                    "bottom_half_of_face": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "脸部下庭大小"
                    },
                    "philtrum_warp": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "脸部人中长度"
                    },
                    "narrow_face": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "脸部宽度"
                    },
                    "cheekbone_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "脸部颧骨_左"
                    },
                    "cheekbone_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "脸部颧骨_右"
                    },
                    "temple_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "脸部太阳穴_左"
                    },
                    "temple_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "脸部太阳穴_右"
                    },
                    "mandible_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "脸部下颌_左"
                    },
                    "mandible_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "脸部下颌_右"
                    },
                    "jaw_trans": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "下巴高度"
                    },
                    "face_trans": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "下巴宽度"
                    },
                    "nasal_tip": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "鼻尖"
                    },
                    "bridge_nose": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "鼻梁"
                    },
                    "shrink_nose": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "鼻翼"
                    },
                    "scale_nose": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "鼻子大小"
                    },
                    "nose_longer": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "鼻子长短"
                    },
                    "nasal_root": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "鼻子山根"
                    },
                    "upperlip_enhance": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "嘴巴丰上唇"
                    },
                    "lowerlip_enhance": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "嘴巴丰下唇"
                    },
                    "mouth_trans": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "嘴巴大小"
                    },
                    "mouth_high": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "嘴巴高度"
                    },
                    "mouth_breadth": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "嘴巴宽度"
                    },
                    "mouth_smile": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "微笑"
                    },
                    "eye_up_down_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "左眼高度"
                    },
                    "eye_up_down_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "右眼高度"
                    },
                    "eye_trans_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "左眼大小"
                    },
                    "eye_trans_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "右眼大小"
                    },
                    "eye_tilt_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "左眼倾斜"
                    },
                    "eye_tilt_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "右眼倾斜"
                    },
                    "eye_height_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "左眼高度"
                    },
                    "eye_height_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "右眼高度"
                    },
                    "eye_lid_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "左眼眼睑"
                    },
                    "eye_lid_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "右眼眼睑"
                    },
                    "eye_distance_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "左眼眼距"
                    },
                    "eye_distance_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "右眼眼距"
                    },
                    "eye_width_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "左眼宽度"
                    },
                    "eye_width_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "右眼宽度"
                    },
                    "inner_eye_corner_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "左眼开眼角"
                    },
                    "inner_eye_corner_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "右眼开眼角"
                    },
                    "eyebrow_tilt_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "左眉毛倾斜"
                    },
                    "eyebrow_tilt_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "右眉毛倾斜"
                    },
                    "eyebrow_height_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "左眉毛高度"
                    },
                    "eyebrow_height_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "右眉毛高度"
                    },
                    "eyebrow_distance_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "左眉毛间距"
                    },
                    "eyebrow_distance_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "右眉毛高度"
                    },
                    "eyebrow_ridge_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,

                        "description": "左眉峰"
                    },
                    "eyebrow_ridge_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "右眉峰"
                    },
                    "eyebrow_size_left": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "左眉毛粗细"
                    },
                    "eyebrow_size_right": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "右眉毛粗细"
                    },
                    "beauty_belly_alpha": {
                        "type": "integer",
                        "enum": [0, 1],
                        "description": "祛妊娠纹"
                    },
                    "baby_remove_dander": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "婴幼儿去瑕疵"
                    },
                    "chest_enlarge": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "丰胸"
                    },
                    "slim_hip": {
                        "type": "integer",
                        "minimum": -100,
                        "maximum": 100,
                        "description": "美胯"
                    },
                    "slim": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "瘦身"
                    },
                    "slim_hand": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "瘦手臂"
                    },
                    "slim_leg": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "瘦腿"
                    },
                    "slim_waist": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "瘦腰"
                    },
                    "shrink_head": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "小头"
                    },
                    "lengthen": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "长腿"
                    },
                    "rmw_rink": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "衣服祛褶皱"
                    },



                }
            },
            "required": []
        }
    },

    // 在此添加第二第三个工具
]