import fs from 'node:fs';
import sharp from 'sharp';

const root = 'ART_STYLE_FOR_CODEX/trials/S2_clay';
const names = fs.readdirSync(`${root}/dark`).filter(name =>
  /(?:ui_01_01|ui_01_02|ui_01_03|ui_01_04|ui_01_05|ui_01_20|streak_freeze|streak_freeze_overlay|dialog_scene_(coffee|grocery|clothes_shop|pharmacy|doctor_visit|phone_delivery|hotel_checkin|airport_checkin|taxi|train_station|lost_luggage|tourist_info|car_rental|first_meeting|small_talk_neighbor|work_call|ask_for_help|invite_friend|complaint_order|lesson18_restaurant_table|lesson20_lost_bag|seat_stolen_cafe|taxi_wrong_way|party_fast_talk|late_excuse_meeting|bill_argument|upsell_trap|neighbor_noise|condescending_interviewer|restaurant|mistaken_celebrity|wrong_dish_better|neighbor_cat_accusation|wrong_wedding|salesman_talks_you_out|dramatic_taxi_actor|surprise_guest_speech|broken_robot_waiter|conspiracy_seatmate|mistaken_for_boss|looping_support_bot|new_colleague_family|gym_signup_form|class_schedule_talk|neighbour_morning_routine|flatmate_room_tour|club_skills_chat|monday_catchup|trip_story_swap|video_call_now|interview_experience|plans_next_year|moving_day_help))_option_/.test(name) && name.endsWith('.source.png'));
for (const name of names) {
  const { data, info } = await sharp(`${root}/dark/${name}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 4) continue;
    const [r, g, b] = data.subarray(i, i + 3);
    if (Math.min(g - r, b - r) > 12) continue; // preserve cyan extraction marker used by clay-marker.mjs
    const luminance = .2126 * r + .7152 * g + .0722 * b;
    const value = Math.max(0, Math.min(255, Math.round(160 + luminance * .84)));
    data[i] = Math.min(255, value + 4);
    data[i + 1] = value;
    data[i + 2] = Math.max(0, value - 8);
  }
  await sharp(data, { raw: info }).png().toFile(`${root}/light/${name}`);
  console.log(name);
}
