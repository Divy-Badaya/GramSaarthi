/**
 * GRAMSAARTHI — Scheme Eligibility Questions Translations
 * Provides rural-friendly Hindi and Gujarati translations for all questions
 * in the official 10 government schemes dataset.
 */
import { getLangCode } from './index.js';

const QUESTION_MAP = {
  // PMMY
  "Do you have or plan an income-generating micro business?": {
    hi: "क्या आपके पास आय उत्पन्न करने वाला सूक्ष्म व्यवसाय है या उसकी योजना है?",
    gu: "શું તમારી પાસે આવક પેદા કરતો સૂક્ષ્મ વ્યવસાય છે અથવા તેનું આયોજન છે?",
  },
  "What business activity?": {
    hi: "व्यवसाय की क्या गतिविधि है?",
    gu: "વ્યવસાયની પ્રવૃત્તિ શું છે?",
  },
  "Do you need a business loan?": {
    hi: "क्या आपको व्यावसायिक ऋण (बिजनेस लोन) की आवश्यकता है?",
    gu: "શું તમને વ્યવસાય લોનની જરૂર છે?",
  },
  "For Tarun Plus, did you successfully repay a Tarun loan?": {
    hi: "तरुण प्लस के लिए, क्या आपने पिछला तरुण ऋण सफलतापूर्वक चुकाया है?",
    gu: "તરુણ પ્લસ માટે, શું તમે અગાઉની તરુણ લોન સફળતાપૂર્વક ચૂકવી છે?",
  },

  // PMEGP
  "Are you 18 or older?": {
    hi: "क्या आपकी आयु 18 वर्ष या उससे अधिक है?",
    gu: "શું તમારી ઉંમર ૧૮ વર્ષ કે તેથી વધુ છે?",
  },
  "Is this a new enterprise?": {
    hi: "क्या यह एक नया उद्यम (नई इकाई) है?",
    gu: "શું આ નવો ઉદ્યોગ/સાહસ છે?",
  },
  "What is the project cost?": {
    hi: "परियोजना की लागत कितनी है?",
    gu: "પ્રોજેક્ટનો ખર્ચ કેટલો છે?",
  },
  "For higher-cost projects, have you passed Class 8?": {
    hi: "उच्च लागत वाली परियोजनाओं के लिए, क्या आपने कक्षा 8 उत्तीर्ण की है?",
    gu: "વધુ ખર્ચવાળા પ્રોજેક્ટ્સ માટે, શું તમે ધોરણ ૮ પાસ કર્યું છે?",
  },

  // PM Vishwakarma
  "Are you self-employed in a notified traditional trade?": {
    hi: "क्या आप किसी अधिसूचित पारंपरिक व्यापार/शिल्प में स्वरोजगार करते हैं?",
    gu: "શું તમે સૂચિત પરંપરાગત વ્યવસાયમાં સ્વ-રોજગાર ધરાવો છો?",
  },
  "Which trade?": {
    hi: "कौन सा पारंपरिक शिल्प या व्यापार?",
    gu: "કયો પરંપરાગત વ્યવસાય/કારીગરી?",
  },
  "Are you currently engaged in it?": {
    hi: "क्या आप वर्तमान में इस शिल्प/व्यापार में सक्रिय हैं?",
    gu: "શું તમે હાલમાં આ કાર્યમાં સક્રિય છો?",
  },
  "Has another family member received the benefit?": {
    hi: "क्या आपके परिवार के किसी अन्य सदस्य को यह लाभ मिला है?",
    gu: "શું તમારા પરિવારના અન્ય કોઈ સભ્યને આ લાભ મળ્યો છે?",
  },
  "Are you a government employee?": {
    hi: "क्या आप सरकारी कर्मचारी हैं?",
    gu: "શું તમે સરકારી કર્મચારી છો?",
  },

  // KCC
  "Are you an owner cultivator, tenant, lessee or sharecropper?": {
    hi: "क्या आप भूमि मालिक कृषक, काश्तकार, पट्टेदार या बटाईदार हैं?",
    gu: "શું તમે જમીન માલિક ખેડૂત, ગણોતિયા, પટ્ટેદાર કે ભાગિયા છો?",
  },
  "Are you an eligible farmer SHG/JLG?": {
    hi: "क्या आप पात्र किसान स्वयं सहायता समूह (SHG) या संयुक्त देयता समूह (JLG) हैं?",
    gu: "શું તમે પાત્ર ખેડૂત SHG અથવા JLG જૂથના સભ્ય છો?",
  },
  "Are you undertaking agriculture or dairy/poultry/fisheries?": {
    hi: "क्या आप कृषि या डेयरी/कुक्कुट पालन/मत्स्य पालन कर रहे हैं?",
    gu: "શું તમે કૃષિ અથવા ડેરી/મરઘાં પાલન/મત્સ્ય પાલન કરી રહ્યા છો?",
  },

  // PMFME
  "Have you passed Class 8?": {
    hi: "क्या आपने कक्षा 8 पास की है?",
    gu: "શું તમે ધોરણ ૮ પાસ કર્યું છે?",
  },
  "Do you own the enterprise?": {
    hi: "क्या उद्यम का स्वामित्व आपके पास है?",
    gu: "શું તમે સાહસ/એકમની માલિકી ધરાવો છો?",
  },
  "Is it an eligible food-processing activity?": {
    hi: "क्या यह एक पात्र खाद्य प्रसंस्करण (Food Processing) गतिविधि है?",
    gu: "શું આ પાત્ર ફૂડ પ્રોસેસિંગ પ્રવૃત્તિ છે?",
  },
  "Can you meet beneficiary contribution and bank-finance requirements?": {
    hi: "क्या आप लाभार्थी अंशदान और बैंक वित्तपोषण की शर्तें पूरी कर सकते हैं?",
    gu: "શું તમે લાભાર્થી ફાળો અને બેંક લોનની જરૂરિયાતો પૂરી કરી શકો છો?",
  },

  // Stand-Up India
  "Are you a woman or SC/ST entrepreneur?": {
    hi: "क्या आप महिला या अनुसूचित जाति/जनजाति (SC/ST) उद्यमी हैं?",
    gu: "શું તમે મહિલા અથવા SC/ST ઉદ્યોગસાહસિક છો?",
  },
  "Is this a greenfield enterprise?": {
    hi: "क्या यह ग्रीनफील्ड (पहली बार स्थापित) उद्यम है?",
    gu: "શું આ ગ્રીનફીલ્ડ (પ્રથમ વખત શરૂ થતો) ઉદ્યોગ છે?",
  },
  "Which sector?": {
    hi: "कौन सा क्षेत्र (विनिर्माण / सेवा / व्यापार)?",
    gu: "કયું ક્ષેત્ર (ઉત્પાદન / સેવા / વેપાર)?",
  },
  "If a non-individual entity, are ownership/control conditions satisfied?": {
    hi: "यदि गैर-व्यक्तिगत इकाई है, तो क्या स्वामित्व/नियंत्रण की शर्तें (51%+) पूरी हैं?",
    gu: "જો બિન-વ્યક્તિગત સંસ્થા હોય, તો શું માલિકી/નિયંત્રણ શરતો (૫૧%+) સંતોષાયેલ છે?",
  },

  // PM-KUSUM
  "Are you a farmer/group/cooperative/panchayat/FPO/WUA?": {
    hi: "क्या आप किसान/समूह/सहकारी समिति/पंचायत/FPO/WUA हैं?",
    gu: "શું તમે ખેડૂત/જૂથ/સહકારી મંડળી/પંચાયત/FPO/WUA છો?",
  },
  "Do you have suitable land?": {
    hi: "क्या आपके पास सौर संयंत्र/पंप के लिए उपयुक्त भूमि है?",
    gu: "શું તમારી પાસે સોલર પ્લાન્ટ/પંપ માટે યોગ્ય જમીન છે?",
  },
  "For Component-A, is the site within the applicable distance of a sub-station?": {
    hi: "घटक-ए के लिए, क्या स्थान निकटतम सब-स्टेशन की निर्धारित दूरी (5 किमी) के भीतर है?",
    gu: "કમ્પોનન્ટ-એ માટે, શું જમીન સબ-સ્ટેશનના માન્ય અંતર (૫ કિમી) ની અંદર છે?",
  },
  "Which component?": {
    hi: "कौन सा घटक (सोलर पंप / ग्रिड पावर प्लांट)?",
    gu: "કયો ઘટક (સોલર પંપ / ગ્રીડ પાવર પ્લાન્ટ)?",
  },

  // NLM
  "Which livestock activity?": {
    hi: "कौन सी पशुधन गतिविधि (कुक्कुट/बकरी/भेड़/चारा)?",
    gu: "કઈ પશુપાલન પ્રવૃત્તિ (મરઘાં/બકરાં/ઘેટાં/ઘાસચારો)?",
  },
  "Are you an individual/FPO/SHG/Section 8 company?": {
    hi: "क्या आप व्यक्ति/FPO/SHG/धारा 8 कंपनी हैं?",
    gu: "શું તમે વ્યક્તિ/FPO/SHG/સેક્શન ૮ કંપની છો?",
  },
  "Do you have required land/infrastructure?": {
    hi: "क्या आपके पास आवश्यक भूमि और बुनियादी ढांचा उपलब्ध है?",
    gu: "શું તમારી પાસે જરૂરી જમીન અને માળખાકીય સુવિધા છે?",
  },
  "Can you meet applicable project-finance conditions?": {
    hi: "क्या आप लागू परियोजना वित्तपोषण शर्तों को पूरा कर सकते हैं?",
    gu: "શું તમે પ્રોજેક્ટ-ફાઇનાન્સની શરતો પૂરી કરી શકો છો?",
  },

  // PMMSY
  "Are you directly engaged in fisheries/aquaculture or an eligible fisheries entity?": {
    hi: "क्या आप सीधे मत्स्य पालन/जलीय कृषि से जुड़े हैं या पात्र मत्स्य संस्था हैं?",
    gu: "શું તમે મત્સ્ય પાલન/એક્વાકલ્ચરમાં સીધા જોડાયેલા છો અથવા પાત્ર સંસ્થા છો?",
  },
  "What activity/project?": {
    hi: "मत्स्य पालन की कौन सी गतिविधि या परियोजना?",
    gu: "મત્સ્ય પાલનની કઈ પ્રવૃત્તિ કે પ્રોજેક્ટ?",
  },
  "What applicant category?": {
    hi: "आवेदक की श्रेणी क्या है (सामान्य / महिला / SC / ST)?",
    gu: "અરજદારની શ્રેણી શું છે (સામાન્ય / મહિલા / SC / ST)?",
  },
  "Is the activity currently supported by your state?": {
    hi: "क्या यह गतिविधि वर्तमान में आपके राज्य मत्स्य विभाग द्वारा समर्थित है?",
    gu: "શું આ પ્રવૃત્તિ હાલમાં તમારા રાજ્ય મત્સ્ય વિભાગ દ્વારા માન્ય છે?",
  },

  // PMFBY
  "Are you growing a notified crop?": {
    hi: "क्या आप इस मौसम में कोई अधिसूचित फसल उगा रहे हैं?",
    gu: "શું તમે આ ઋતુમાં સૂચિત પાક ઉગાડી રહ્યા છો?",
  },
  "Is your location/crop notified this season?": {
    hi: "क्या आपका क्षेत्र और फसल इस मौसम के लिए बीमा हेतु अधिसूचित है?",
    gu: "શું તમારો વિસ્તાર અને પાક આ સીઝન માટે વીમા હેઠળ સૂચિત છે?",
  },
  "Do you have insurable interest?": {
    hi: "क्या आपका फसल में बीमा योग्य हित है?",
    gu: "શું તમારો પાકમાં વીમા યોગ્ય હિત છે?",
  },
  "Are you an owner, sharecropper or tenant with acceptable documents?": {
    hi: "क्या आप मान्य दस्तावेजों के साथ भूमि मालिक, बटाईदार या काश्तकार हैं?",
    gu: "શું તમે માન્ય દસ્તાવેજો સાથે જમીન માલિક, ભાગિયા કે ગણોતિયા છો?",
  },

  // Backend evaluated criteria strings
  "Protects agricultural production": {
    hi: "कृषि उत्पादन की सुरक्षा करता है",
    gu: "કૃષિ ઉત્પાદનનું રક્ષણ કરે છે",
  },
  "Supports selected venture": {
    hi: "चयनित उद्यम का समर्थन करता है",
    gu: "પસંદ કરેલા વ્યવસાયને ટેકો આપે છે",
  },
  "Women / SC-ST greenfield venture": {
    hi: "महिला / अनुसूचित जाति-जनजाति ग्रीनफील्ड उद्यम",
    gu: "મહિલા / SC-ST ગ્રીનફીલ્ડ સાહસ",
  },
  "Project loan under ₹10–20 Lakh": {
    hi: "₹10–20 लाख के तहत परियोजना ऋण",
    gu: "₹૧૦–૨૦ લાખ હેઠળ પ્રોજેક્ટ લોન",
  },
  "Universal micro-credit for trade/services": {
    hi: "व्यापार/सेवाओं के लिए सार्वभौमिक सूक्ष्म ऋण",
    gu: "વેપાર/સેવાઓ માટે સાર્વત્રિક સૂક્ષ્મ લોન",
  },
  "Substantial rural capital margin money subsidy": {
    hi: "ग्रामीण पूंजी मार्जिन मनी पर पर्याप्त सरकारी सब्सिडी",
    gu: "ગ્રામીણ મૂડી માર્જિન મની પર પૂરતી સરકારી સબસિડી",
  },
  "Dedicated fisheries infrastructure assistance": {
    hi: "मत्स्य पालन अवसंरचना के लिए समर्पित सहायता",
    gu: "મત્સ્ય પાલન માળખાગત સુવિધાઓ માટે વિશેષ સહાય",
  },
  "Capital subsidy for livestock & poultry": {
    hi: "पशुधन और कुक्कुट पालन के लिए पूंजीगत सब्सिडी",
    gu: "પશુધન અને મરઘાં પાલન માટે મૂડી સબસિડી",
  },
  "Solar water pump subsidy up to 60%": {
    hi: "सौर जल पंप पर 60% तक सब्सिडी",
    gu: "સોલર વોટર પંપ પર ૬૦% સુધી સબસિડી",
  },
  "Subsidized artisan tools and credit": {
    hi: "कारीगरों के लिए सब्सिडी वाले औजार और रियायती ऋण",
    gu: "કારીગરો માટે સબસિડીવાળા સાધનો અને રાહત દરે લોન",
  },
  "Food processing credit-linked capital subsidy": {
    hi: "खाद्य प्रसंस्करण के लिए क्रेडिट-लिंक्ड पूंजीगत सब्सिडी",
    gu: "ફૂડ પ્રોસેસિંગ માટે ક્રેડિટ-લિંક્ડ મૂડી સબસિડી",
  },
  "Working capital for dairy/allied activities": {
    hi: "डेयरी/संबद्ध गतिविधियों के लिए कार्यशील पूंजी",
    gu: "ડેરી/સંલગ્ન પ્રવૃત્તિઓ માટે કાર્યકારી મૂડી",
  },
};

/**
 * Return the localized version of an eligibility question.
 *
 * @param {string} question - Question text in English
 * @param {string} lang - 'en' | 'hi' | 'gu'
 * @returns {string} Localized question text
 */
export function getLocalizedQuestion(question, lang = 'en') {
  if (!question) return '';
  const code = getLangCode(lang);
  const trimmed = question.trim();
  const entry = QUESTION_MAP[trimmed];
  if (!entry) {
    // Try matching without trailing punctuation
    for (const [key, val] of Object.entries(QUESTION_MAP)) {
      if (key.toLowerCase() === trimmed.toLowerCase()) {
        return val[code] || trimmed;
      }
    }
    return trimmed;
  }
  return entry[code] || trimmed;
}
