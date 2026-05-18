function normalizeQuestion(entry) {
  if (entry.ka && entry.en) {
    return {
      id: entry.id,
      ka: { normal: entry.ka.normal, impostor: entry.ka.impostor },
      en: { normal: entry.en.normal, impostor: entry.en.impostor },
    };
  }
  return {
    id: entry.id,
    ka: { normal: entry.normal, impostor: entry.impostor },
    en: { normal: entry.normal, impostor: entry.impostor },
  };
}

const RAW_QUESTIONS = [
  // Bilingual: use { id, ka: { normal, impostor }, en: { normal, impostor } }.
  // Legacy single-language rows copy the same text into both ka and en until you add real English.
  // {
  //   "id": ,
  //   ka: { normal: , impostor: },
  //   en: { normal: , impostor: },
  // },
  {
    id: 1,
    ka: { normal: 'რომელ ფილმში იცხოვრებდი?', impostor: 'ყველაზე საშიში ფილმი?' },
    en: { normal: 'Which movie would you live inside?', impostor: 'What is the scariest movie?' },
  },
  { "id": 2, 
    ka: { normal: "რა არის კარგი ასაკი პირველი შვილის გასაჩენად?" , impostor: "დაწერე რიცხვი 1-50 მდე"},
    en: { normal: "What is the best age for a first child?", impostor: "Write a number between 1 and 50." },
  },
  { "id": 3, 
     ka: { normal: "თქვენს შორის რომელი ითამაშებდა რაგბს საუკეთესოდ?" , impostor: "თქვენს შორის ვინაა ყველაზე მარტივად მოსატყუებელი?"},
     en: { normal: "Which of you can play rugby the best?", impostor: "Who is the easiest to lie to out of you?" },
  },
  {
    "id": 4,
    ka: { normal: "ზომბი აპოკალიფსში რომელ ცხოველს იყოლიებდი?", impostor: "რომელი ცხოველი არ გინახავს რეალობაში?"},
    en: { normal: "Which animal would you keep in a zombie apocalypse", impostor: "Which animal haven't you seen in real life?" },
  },
  {
    "id": 5,
    ka: { normal: "რამდენ მე-3 კლასელს მოერეოდი ერთდროულად?", impostor: "დაწერე რიცხვი 1-50 მდე"},
    en: { normal: "How many third graders can you beat together?", impostor: "Write a number between 1 and 50." },
  },
  {
    "id": 6,
    ka: { normal: "ერთ მისვლაზე რამდენი ბურგერის ჭამა შეგიძლია?", impostor: "ერთ მისვლაზე რამდენ ჭიქა არაყს სვამ?"},
    en: { normal: "How many burgers can you eat in one go?", impostor: "How many vodka shots can you take in one go?" },
  },
  {
    "id": 7,
    ka: { normal: "საუკეთესო ხილი?", impostor: "საუკეთესო ბოსტნეული?"},
    en: { normal: "What is the best fruit?", impostor: "What is the best alcoholic drink?" },
  },
  {
    "id": 8,
    ka: { normal: "საუკეთესო ფილმი?", impostor: "ყველაზე overrated ფილმი?"},
    en: { normal: "What is the best movie?", impostor: "What is the most overrated movie?" },
  },
  {
    "id": 9,
    ka: { normal: "რას დაირქმევდი სხვა ცხოვრებაში?", impostor: "რომელი სახელი არ მოგწონს ყველაზე მეტად?"},
    en: { normal: "What would your name be in another life?", impostor: "Which name do you dislike the most?"},
  },
  {
    "id": 10,
    ka: { normal: "რამდენი დღე არის ნორმალური დაუბანლობა?", impostor: "დაწერე რიცხვი 1-30 მდე"},
    en: { normal: "How long is normal to go without showering?", impostor: "Write a number between 1 and 30."},
  },
  {
    "id": 11,
    ka: { normal: "მხოლოდ ერთი კერძის ჭამა რომ შეგეძლოს, რას შეჭამდი?", impostor: "შენთვის ყველაზე საშინელი კერძი?"},
    en: { normal: "If you could only eat one meal, what meal would it be?", impostor: "Which meal do you dislike the most?"},
  }, 
  {
    "id": 12,
    ka: { normal: "საუკეთესო თამაში?", impostor: "ყველაზე ბანძი თამაში?"},
    en: { normal: "What is the best game?", impostor: "What is the most boring game?" },
  },     
  {
    "id": 13,
    ka: { normal: "მაქსიმუმ რამდენი დაგილევია ერთ დღეში?", impostor: "რამდენ ჭიქაში თვრები?"},
    en: { normal: "How many drinks can you drink in one day?", impostor: "From how many drinks do you get drunk?" },
  },  
  {
    "id": 14,
    ka: { normal: "რომელ ქვეყანაში იცხოვრებდი?", impostor: "რომელ ქვეყანაში არ იცხოვრებდი?"},
    en: { normal: "Which country would you live in?", impostor: "Which country would you never live in?"},
  },  
  {
    "id": 15,
    ka: { normal: "რომელ გამოგონილ პერსონაჟს გაუცვლიდი ცხოვრებას?", impostor: "რომელი გამოგონილი პერსონაჟი გძულს ყველაზე მეტად?"},
    en: { normal: "Which famous person would you switch lives with?", impostor: "Which famous person do you dislike the most?"},
  },  
  {
    "id": 16,
    ka: { normal: "ყველაზე უცნაური/სულელური რამ რისიც ბავშვობაში გჯეროდა?", impostor: "ყველაზე სისულელე თეორია რაც მოგისმენია?"},
    en: { normal: "What is the most unusual thing you believed as a child?", impostor: "What is the dumbest theory you have heard?"},
  }, 
  {
    "id": 17,
    ka: { normal: "გაღვიძების შემდეგ რამდენი ხანი რჩები საწოლში?", impostor: "დაწერე რიცხვი 1-50 მდე."},
    en: { normal: "How long do you stay in bed after waking up?", impostor: "Write a number between 1 and 50." },
  },   
  {
    "id": 18,
    ka: { normal: "საუკეთესო კერძი რაც კი დაგიგემოვნებია?", impostor: "რომელი კერძის გაკეთება შეგიძლია?"},
    en: { normal: "What is the best meal you have tasted?", impostor: "What is one meal you can make?"},
  },  
  {
    "id": 19,
    ka: { normal: "რომელ თამაშს სჭირდება ყველაზე მეტი skill?", impostor: "რომელ თამაშს თამაშობ ყველაზე ხშირად?"},
    en: { normal: "Which game requires the most skill?", impostor: "Which game do you play the most?"},
  },  
  {
    "id": 20,
    ka: { normal: "რამდენ დღეს გაძლებდი ციხეში?", impostor: "რამდენ დღეს გაძლებდი უინტერნეტოდ?"},
    en: { normal: "How many days would you last in prison?", impostor: "How many days would you last without internet?"},
  },  
  {
    "id": 21,
    ka: { normal: "რომელი სიმღერა გიშლის ნერვებს?", impostor: "რომელი სიმღერა გიყვარს ყველაზე მეტად?"},
    en: { normal: "Which song annoys you the most?", impostor: "Which song do you like the most?"},
  },  
  {
    "id": 22,
    ka: { normal: "რომელ ინფლუენსერს მოერეოდი ჩხუბში?", impostor: "რომელი ინფლუენსერი გიყვარს ყველაზე მეტად?"},
    en: { normal: "Which influencer would you beat in a fight?", impostor: "Which influencer do you like the most?"},
  }, 
  {
    "id": 23,
    ka: { normal: "რომელ ქართველ celebrity-ს ისურვებდი პრეზიდენტად?", impostor: "რომელი ქართველ celebrity გძულს ყველაზე მეტად?"},
    en: { normal: "Which Georgian celebrity would you vote for as president?", impostor: "Which Georgian celebrity do you dislike the most?"},
  },   
  {
    "id": 24,
    ka: { normal: "რამდენი დღე გაძლებდი საჭმლის გარეშე?", impostor: "რამდენი დღე გჭირდება წიგნის წასაკითხად?"},
    en: { normal: "How many days would you last without food?", impostor: "How many days do you need to finish a book?"},
  }, 
  {
    "id": 25,
    ka: { normal: "რამდენი დღე გაძლებდი უღრან ტყეში?", impostor: "დაწერე რიცხვი 1-100 მდე."},
    en: { normal: "How many days would you last in a deep forest?", impostor: "Write a number between 1 and 100."},
  }, 
  {
    "id": 26,
    ka: { normal: "რომელ ცხოველს მოერეოდი ჩხუბში?", impostor: "რომელი ცხოველი მოგერეოდა ჩხუბში?"},
    en: { normal: "Which animal would you beat in a fight?", impostor: "Which animal would beat you in a fight?"},
  }, 
  {
    "id": 27,
    ka: { normal: "რომელ ათლეტს მოერეოდი თავის სპორტში?", impostor: "დაწერე ნებისმიერი ათლეტი."},
    en: { normal: "Which athlete would you beat in their sport?", impostor: "Write any athlete."},
  }, 
  {
    "id": 28,
    ka: { normal: "საუკეთესო ასაკი პენსიისთვის?", impostor: "დაწერე რიცხვი 30-60 მდე."},
    en: { normal: "What is the best age for a retirement?", impostor: "Write a number between 30 and 60."},
  }, 
  {
    "id": 29,
    ka: { normal: "რომელი საათია იდეალური გაღვიძებისთვის?", impostor: "რომელ საათზე იძინებ ყველაზე ხშირად?"},
    en: { normal: "What time is ideal for waking up?", impostor: "on what time do you sleep the most?"},
  }, 
  {
    "id": 30,
    ka: { normal: "რამდენი ხანი გჭირდება საბანაოდ?", impostor: "რამდენი ხანი გჭირდება საჭმელად?"},
    en: { normal: "How long do you need to shower?", impostor: "How long do you need to eat?"},
  },   
  {
    "id": 31,
    ka: { normal: "რა სპორტს უყურებ ყველაზე ხშირად?", impostor: "დაწერე ნებისმიერი სპორტი."},
    en: { normal: "Which sport do you watch the most?", impostor: "Write any sport."},
  },   
  {
    "id": 32,
    ka: { normal: "რომელი ემოჯი გამოიყენე ბოლოს?", impostor: "რა ემოჯს არ იყენებ არასდროს?"},
    en: { normal: "Which emoji did you use last?", impostor: "Which emoji do you never use?"},
  }
];

module.exports = RAW_QUESTIONS.map(normalizeQuestion);