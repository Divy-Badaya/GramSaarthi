/**
 * GRAMSAARTHI — Government Schemes Localization System
 * Provides verified Hindi (हिन्दी) and Gujarati (ગુજરાતી) representations
 * for all 10 official schemes without modifying the underlying raw dataset.
 */

import { getLocalizedQuestion } from './schemeQuestions.js';
import { getLangCode } from './index.js';

export const SCHEME_LOCALIZED_DATA = {
  PMMY: {
    en: {
      category: 'Finance & MSME',
      max_loan: 'Up to ₹20 Lakh',
      interest: '7% – 10% p.a.',
      tenure: '3 to 5 years',
      subsidy: 'Collateral-free + Mudra credit guarantee',
      who: 'Micro/small business owners across manufacturing, trading, services and allied agri',
      benefit: 'Collateral-free micro loans from ₹50,000 up to ₹20 Lakh across Shishu, Kishore, Tarun, and Tarun Plus tiers.',
      eligibility_criteria: 'Individual applicants with a business plan for income-generating micro/small businesses in manufacturing, trading, services and activities allied to agriculture. Tarun Plus additionally requires successful repayment of a previous Tarun loan.',
      docs: ['Aadhaar Card', 'PAN Card', 'Business Plan / Quotation', 'Bank Statement (6 months)', 'Proof of Business Address'],
    },
    hi: {
      category: 'वित्त एवं एमएसएमई',
      max_loan: '₹20 लाख तक',
      interest: '7% – 10% प्रति वर्ष',
      tenure: '3 से 5 वर्ष',
      subsidy: 'बिना गारंटी + मुद्रा ऋण गारंटी सुरक्षा',
      who: 'विनिर्माण, व्यापार, सेवा और कृषि संबद्ध गतिविधियों में सूक्ष्म/लघु व्यवसाय मालिक',
      benefit: 'शिशु, किशोर, तरुण और तरुण प्लस श्रेणियों में बिना किसी गारंटी के ₹50,000 से ₹20 लाख तक का सूक्ष्म ऋण।',
      eligibility_criteria: 'विनिर्माण, व्यापार, सेवा और कृषि से संबद्ध गतिविधियों में आय सृजन करने वाले सूक्ष्म/लघु उद्यमों के लिए व्यावसायिक योजना रखने वाले व्यक्तिगत आवेदक। तरुण प्लस के लिए पूर्व तरुण ऋण का समय पर भुगतान आवश्यक है।',
      docs: ['आधार कार्ड', 'पैन कार्ड', 'व्यवसाय योजना / कोटेशन', 'बैंक विवरण (6 महीने)', 'व्यवसाय पते का प्रमाण'],
    },
    gu: {
      category: 'નાણાં અને MSME',
      max_loan: '₹૨૦ લાખ સુધી',
      interest: '૭% – ૧૦% વાર્ષિક',
      tenure: '૩ થી ૫ વર્ષ',
      subsidy: 'કોઈપણ ગેરંટી વિના + મુદ્રા ક્રેડિટ ગેરંટી',
      who: 'ઉત્પાદન, વેપાર, સેવાઓ અને કૃષિ સંલગ્ન પ્રવૃત્તિઓમાં સૂક્ષ્મ/નાના વ્યવસાય માલિકો',
      benefit: 'શિશુ, કિશોર, તરુણ અને તરુણ પ્લસ શ્રેણીઓમાં કોઈપણ ગેરંટી વિના ₹૫૦,૦૦૦ થી ₹૨૦ લાખ સુધીની સૂક્ષ્મ લોન.',
      eligibility_criteria: 'ઉત્પાદન, વેપાર, સેવાઓ અને કૃષિ સંબંધિત પ્રવૃત્તિઓમાં આવક પેદા કરતા સૂક્ષ્મ/નાના વ્યવસાયો માટે બિઝનેસ પ્લાન ધરાવતા વ્યક્તિગત અરજદારો. તરુણ પ્લસ માટે અગાઉની તરુણ લોનની સમયસર ચુકવણી જરૂરી છે.',
      docs: ['આધાર કાર્ડ', 'પાન કાર્ડ', 'બિઝનેસ પ્લાન / ક્વોટેશન', 'બેંક સ્ટેટમેન્ટ (૬ મહિના)', 'વ્યવસાય સરનામાનો પુરાવો'],
    },
  },

  PMEGP: {
    en: {
      category: 'MSME & Employment',
      max_loan: 'Up to ₹50 Lakh (Mfg) / ₹20 Lakh (Service)',
      interest: 'Bank rate (~8.5% p.a.)',
      tenure: '3 to 7 years',
      subsidy: '15% to 35% margin money subsidy',
      who: 'Individual rural applicants aged 18+ establishing new micro-enterprises',
      benefit: 'Substantial government margin money subsidy up to 35% of project cost for rural and special category beneficiaries.',
      eligibility_criteria: 'Individual applicant above 18. No income ceiling for new projects. For projects above ₹10 lakh manufacturing or ₹5 lakh business/service, at least VIII-standard pass is required. Assistance is for new PMEGP projects; existing units already assisted under specified government schemes are not eligible for new-unit assistance.',
      docs: ['Aadhaar Card', 'Educational Certificate (Class 8+ for larger projects)', 'Project Report (DPR)', 'Rural Area Certificate', 'Caste/Special Category Certificate (if applicable)'],
    },
    hi: {
      category: 'एमएसएमई एवं रोजगार',
      max_loan: '₹50 लाख (विनिर्माण) / ₹20 लाख (सेवा)',
      interest: 'बैंक दर (~8.5% प्रति वर्ष)',
      tenure: '3 से 7 वर्ष',
      subsidy: '15% से 35% सरकारी मार्जिन मनी सब्सिडी',
      who: 'नया सूक्ष्म उद्यम स्थापित करने वाले 18 वर्ष से अधिक आयु के ग्रामीण व्यक्तिगत आवेदक',
      benefit: 'ग्रामीण और विशेष श्रेणी के लाभार्थियों के लिए परियोजना लागत का 35% तक सरकारी मार्जिन मनी अनुदान (सब्सिडी)।',
      eligibility_criteria: '18 वर्ष से अधिक आयु के व्यक्तिगत आवेदक। नई परियोजनाओं के लिए कोई आय सीमा नहीं। विनिर्माण में ₹10 लाख और सेवा में ₹5 लाख से अधिक लागत के लिए न्यूनतम 8वीं कक्षा उत्तीर्ण होना आवश्यक है। सहायता केवल नए उद्यमों के लिए है।',
      docs: ['आधार कार्ड', 'शैक्षणिक प्रमाण पत्र (बड़ी परियोजनाओं के लिए 8वीं+)', 'विस्तृत परियोजना रिपोर्ट (DPR)', 'ग्रामीण क्षेत्र प्रमाण पत्र', 'जाति / विशेष श्रेणी प्रमाण पत्र (यदि लागू हो)'],
    },
    gu: {
      category: 'MSME અને રોજગાર',
      max_loan: '₹૫૦ લાખ (ઉત્પાદન) / ₹૨૦ લાખ (સેવા)',
      interest: 'બેંક દર (~૮.૫% વાર્ષિક)',
      tenure: '૩ થી ૭ વર્ષ',
      subsidy: '૧૫% થી ૩૫% સરકારી માર્જિન મની સબસિડી',
      who: 'નવો સૂક્ષ્મ ઉદ્યોગ શરૂ કરનાર ૧૮ વર્ષથી વધુ ઉંમરના ગ્રામીણ વ્યક્તિગત અરજદારો',
      benefit: 'ગ્રામીણ અને વિશેષ કેટેગરીના લાભાર્થીઓ માટે પ્રોજેક્ટ ખર્ચના ૩૫% સુધીની સરકારી માર્જિન મની સબસિડી.',
      eligibility_criteria: '૧૮ વર્ષથી વધુ ઉંમરના વ્યક્તિગત અરજદાર. નવા પ્રોજેક્ટ માટે કોઈ આવક મર્યાદા નથી. ઉત્પાદનમાં ₹૧૦ લાખ અને સેવામાં ₹૫ લાખથી વધુ ખર્ચ માટે ઓછામાં ઓછું ધોરણ ૮ પાસ જરૂરી છે. સહાય ફક્ત નવા સાહસો માટે છે.',
      docs: ['આધાર કાર્ડ', 'શૈક્ષણિક પ્રમાણપત્ર (મોટા પ્રોજેક્ટ માટે ધોરણ ૮+)', 'પ્રોજેક્ટ રિપોર્ટ (DPR)', 'ગ્રામીણ વિસ્તાર પ્રમાણપત્ર', 'જાતિ / વિશેષ કેટેગરી પ્રમાણપત્ર (જો લાગુ હોય)'],
    },
  },

  PMVISHWAKARMA: {
    en: {
      category: 'Artisans & Skill',
      max_loan: 'Up to ₹3 Lakh (Tranche 1: ₹1L, Tranche 2: ₹2L)',
      interest: 'Concessional 5% p.a.',
      tenure: '18 to 30 months',
      subsidy: '₹15,000 tool kit voucher + ₹500/day stipend',
      who: 'Artisans & craftspeople in 18 notified traditional trades on self-employment basis',
      benefit: 'Recognition ID card, skill upskilling, ₹15,000 e-voucher for modern tools, and collateral-free enterprise loan at 5% interest.',
      eligibility_criteria: 'Applicant must be an artisan/craftsperson working with hands and tools in one of 18 notified traditional trades, in the unorganised sector on self-employment basis; minimum age 18; actively engaged in the trade; one member per family; government employees and their family members excluded.',
      docs: ['Aadhaar Card', 'Mobile Linked with Aadhaar', 'Bank Account Details', 'Ration Card / Family Proof', 'Self-declaration of traditional trade'],
    },
    hi: {
      category: 'शिल्पकार एवं कौशल',
      max_loan: '₹3 लाख तक (किस्त 1: ₹1 लाख, किस्त 2: ₹2 लाख)',
      interest: 'रियायती 5% प्रति वर्ष',
      tenure: '18 से 30 महीने',
      subsidy: '₹15,000 टूलकिट वाउचर + ₹500/दिन प्रशिक्षण भत्ता',
      who: 'स्वरोजगार के आधार पर 18 अधिसूचित पारंपरिक शिल्पों में काम करने वाले कारीगर और शिल्पकार',
      benefit: 'पहचान प्रमाण पत्र, कौशल प्रशिक्षण भत्ता, ₹15,000 का आधुनिक टूलकिट वाउचर और 5% ब्याज पर बिना गारंटी ऋण।',
      eligibility_criteria: 'आवेदक को असंगठित क्षेत्र में 18 अधिसूचित पारंपरिक शिल्पों में हाथों और औजारों से काम करने वाला कारीगर होना चाहिए; न्यूनतम आयु 18 वर्ष; प्रति परिवार एक सदस्य; सरकारी कर्मचारी और उनके परिवार के सदस्य अपात्र हैं।',
      docs: ['आधार कार्ड', 'आधार से लिंक मोबाइल नंबर', 'बैंक खाता विवरण', 'राशन कार्ड / पारिवारिक पहचान', 'पारंपरिक शिल्प की स्व-घोषणा'],
    },
    gu: {
      category: 'કારીગરો અને કૌશલ્ય',
      max_loan: '₹૩ લાખ સુધી (પ્રથમ હપ્તો: ₹૧ લાખ, બીજો હપ્તો: ₹૨ લાખ)',
      interest: 'રાહત દરે ૫% વાર્ષિક',
      tenure: '૧૮ થી ૩૦ મહિના',
      subsidy: '₹૧૫,૦૦૦ ટૂલકિટ વાઉચર + ₹૫૦૦/દિવસ તાલીમ ભથ્થું',
      who: 'સ્વ-રોજગારના ધોરણે ૧૮ સૂચિત પરંપરાગત વ્યવસાયોમાં કાર્યરત કારીગરો અને શિલ્પકારો',
      benefit: 'ઓળખપત્ર, કૌશલ્ય તાલીમ ભથ્થું, ₹૧૫,૦૦૦ નું ટૂલકિટ વાઉચર અને ૫% વ્યાજે ગેરંટી વિના લોન.',
      eligibility_criteria: 'અરજદાર અસંગઠિત ક્ષેત્રમાં ૧૮ સૂચિત પરંપરાગત વેપારમાં હાથ અને સાધનો વડે કામ કરતા કારીગર હોવા જોઈએ; ન્યૂનતમ ઉંમર ૧૮ વર્ષ; કુટુંબ દીઠ એક સભ્ય; સરકારી કર્મચારીઓ અને તેમના પરિવારો બાકાત છે.',
      docs: ['આધાર કાર્ડ', 'આધાર સાથે લિંક થયેલ મોબાઈલ', 'બેંક ખાતાની વિગતો', 'રેશનકાર્ડ / પરિવારનો પુરાવો', 'પરંપરાગત વ્યવસાયનું સ્વ-ઘોષણાપત્ર'],
    },
  },

  KCC: {
    en: {
      category: 'Agriculture & Allied',
      max_loan: 'Up to ₹3 Lakh (Collateral-free up to ₹1.6 Lakh)',
      interest: 'Effective 4% p.a.',
      tenure: '1 to 5 years revolving',
      subsidy: '3% prompt repayment incentive + 2% interest subvention',
      who: 'Farmers, tenant farmers, oral lessees, dairy keepers, poultry farmers, fishers, and SHGs/JLGs',
      benefit: 'Timely and adequate credit support with simple interest subvention bringing net interest rate down to 4% per annum.',
      eligibility_criteria: 'Eligible groups include owner cultivators; tenant farmers, oral lessees and sharecroppers; and eligible farmer SHGs/JLGs. KCC also covers credit needs for allied activities such as dairy, poultry and fisheries subject to applicable norms.',
      docs: ['Land Ownership / Tenancy Records', 'Aadhaar Card', 'PAN Card', 'Livestock / Animal count declaration', 'Passport Photo'],
    },
    hi: {
      category: 'कृषि एवं संबद्ध क्षेत्र',
      max_loan: '₹3 लाख तक (₹1.6 लाख तक बिना गारंटी)',
      interest: 'प्रभावी 4% प्रति वर्ष',
      tenure: '1 से 5 वर्ष (रिवॉल्विंग)',
      subsidy: '3% समय पर भुगतान प्रोत्साहन + 2% ब्याज अनुदान',
      who: 'किसान, काश्तकार, पट्टेदार, बटाईदार, डेयरी पालक, कुक्कुट पालक, मछुआरे और किसान SHG/JLG समूह',
      benefit: 'समय पर ऋण सहायता, जिसमें ब्याज अनुदान (सबवेंशन) के साथ प्रभावी ब्याज दर मात्र 4% प्रति वर्ष हो जाती है।',
      eligibility_criteria: 'पात्र समूहों में भूमि मालिक किसान, काश्तकार, पट्टेदार और बटाईदार, तथा किसान SHG/JLG शामिल हैं। केसीसी डेयरी, कुक्कुट और मत्स्य पालन जैसी संबद्ध गतिविधियों के लिए भी कार्यशील पूंजी ऋण प्रदान करता है।',
      docs: ['भूमि स्वामित्व / काश्तकारी दस्तावेज', 'आधार कार्ड', 'पैन कार्ड', 'पशुधन / जानवर संख्या घोषणा', 'पासपोर्ट फोटो'],
    },
    gu: {
      category: 'કૃષિ અને સંલગ્ન ક્ષેત્ર',
      max_loan: '₹૩ લાખ સુધી (₹૧.૬ લાખ સુધી ગેરંટી વિના)',
      interest: 'અસરકારક ૪% વાર્ષિક',
      tenure: '૧ થી ૫ વર્ષ (રિવોલ્વિંગ)',
      subsidy: '૩% સમયસર ચુકવણી પ્રોત્સાહન + ૨% વ્યાજ સબવેન્શન',
      who: 'ખેડૂતો, ગણોતિયા, પટ્ટેદાર, ભાગિયા, ડેરી પાલકો, મરઘાં પાલકો, માછીમારો અને SHG/JLG જૂથો',
      benefit: 'સમયસર લોન સહાય, જેમાં વ્યાજ સબવેન્શન સાથે ચોખ્ખો વ્યાજ દર માત્ર ૪% વાર્ષિક થઈ જાય છે.',
      eligibility_criteria: 'પાત્ર જૂથોમાં જમીન માલિક ખેડૂતો, ગણોતિયા, પટ્ટેદારો અને ભાગિયાઓ, તેમજ ખેડૂત SHG/JLG નો સમાવેશ થાય છે. KCC ડેરી, મરઘાં અને મત્સ્ય પાલન જેવી સંલગ્ન પ્રવૃત્તિઓ માટે કાર્યકારી મૂડી પણ પૂરી પાડે છે.',
      docs: ['જમીન માલિકી / ગણોત દસ્તાવેજો', 'આધાર કાર્ડ', 'પાન કાર્ડ', 'પશુધનની સંખ્યાનું ઘોષણાપત્ર', 'પાસપોર્ટ ફોટો'],
    },
  },

  PMFME: {
    en: {
      category: 'Food Processing & MSME',
      max_loan: 'Up to ₹10 Lakh credit-linked subsidy',
      interest: 'Bank lending rate',
      tenure: '3 to 7 years',
      subsidy: '35% capital subsidy (up to ₹10 Lakh per unit)',
      who: 'Micro food processing entrepreneurs, FPOs, SHGs, and food manufacturing units',
      benefit: 'Credit-linked capital subsidy of 35% on project cost, ODOP branding, quality control certification, and food safety training.',
      eligibility_criteria: 'For individual assistance, applicant should be above 18, at least VIII-standard pass and have ownership rights in the enterprise; enterprise may be proprietorship or partnership. Other component, ODOP, contribution and bank-finance conditions apply.',
      docs: ['Aadhaar Card', 'Educational Proof (Class 8+)', 'DPR / Food Project Report', 'FSSAI Registration (or intent to register)', 'Bank Account & Land/Premises Proof'],
    },
    hi: {
      category: 'खाद्य प्रसंस्करण एवं एमएसएमई',
      max_loan: '₹10 लाख तक क्रेडिट-लिंक्ड सब्सिडी',
      interest: 'सामान्य बैंक ऋण दर',
      tenure: '3 से 7 वर्ष',
      subsidy: '35% पूंजीगत सब्सिडी (अधिकतम ₹10 लाख प्रति इकाई)',
      who: 'सूक्ष्म खाद्य प्रसंस्करण उद्यमी, किसान उत्पादक संगठन (FPO), स्वयं सहायता समूह और खाद्य विनिर्माण इकाइयां',
      benefit: 'परियोजना लागत पर 35% पूंजीगत अनुदान (सब्सिडी), एक जिला एक उत्पाद (ODOP) ब्रांडिंग और खाद्य सुरक्षा प्रशिक्षण।',
      eligibility_criteria: 'व्यक्तिगत सहायता के लिए आवेदक 18 वर्ष से अधिक आयु का, कम से कम 8वीं पास और उद्यम में मालिकाना हक रखने वाला होना चाहिए; उद्यम स्वामित्व या साझेदारी हो सकता है। ODOP और लाभार्थी अंशदान शर्तें लागू होती हैं।',
      docs: ['आधार कार्ड', 'शैक्षणिक प्रमाण (8वीं कक्षा पास)', 'परियोजना रिपोर्ट (DPR)', 'FSSAI पंजीकरण या आवेदन रसीद', 'बैंक खाता और परिसर का प्रमाण'],
    },
    gu: {
      category: 'ફૂડ પ્રોસેસિંગ અને MSME',
      max_loan: '₹૧૦ લાખ સુધી ક્રેડિટ-લિંક્ડ સબસિડી',
      interest: 'સામાન્ય બેંક લોન દર',
      tenure: '૩ થી ૭ વર્ષ',
      subsidy: '૩૫% મૂડી સબસિડી (મહત્તમ ₹૧૦ લાખ પ્રતિ એકમ)',
      who: 'સૂક્ષ્મ ફૂડ પ્રોસેસિંગ ઉદ્યોગસાહસિકો, FPO, સ્વ-સહાય જૂથો (SHG) અને ખાદ્ય ઉત્પાદન એકમો',
      benefit: 'પ્રોજેક્ટ ખર્ચ પર ૩૫% મૂડી સબસિડી, એક જિલ્લો એક ઉત્પાદન (ODOP) બ્રાન્ડિંગ અને ખાદ્ય સુરક્ષા તાલીમ.',
      eligibility_criteria: 'વ્યક્તિગત સહાય માટે અરજદાર ૧૮ વર્ષથી વધુ ઉંમરના, ઓછામાં ઓછું ધોરણ ૮ પાસ અને એકમમાં માલિકી હક ધરાવતા હોવા જોઈએ; ODOP અને લાભાર્થી ફાળાની શરતો લાગુ પડે છે.',
      docs: ['આધાર કાર્ડ', 'શૈક્ષણિક પુરાવો (ધોરણ ૮ પાસ)', 'પ્રોજેક્ટ રિપોર્ટ (DPR)', 'FSSAI રજીસ્ટ્રેશન', 'બેંક ખાતું અને જગ્યાનો પુરાવો'],
    },
  },

  STANDUP_INDIA: {
    en: {
      category: 'Women & SC/ST Finance',
      max_loan: '₹10 Lakh to ₹1 Crore',
      interest: 'Base Rate + lowest MCLR',
      tenure: 'Up to 7 years',
      subsidy: 'Composite loan covering up to 85% of project cost',
      who: 'SC/ST and Women entrepreneurs setting up greenfield (first-time) ventures',
      benefit: 'High-value composite loan covering equipment and working capital with guidance through Stand-Up Mitra portal.',
      eligibility_criteria: 'Designed for SC/ST and women entrepreneurs establishing greenfield enterprises in manufacturing, services, trading or activities allied to agriculture. Exact entity ownership/control and lender conditions must be checked under current rules.',
      docs: ['Identity & Address Proof', 'Caste Certificate (for SC/ST) or Women Promoter Proof (51%+ stake)', 'Project Report (DPR)', 'Pollution / License clearances', 'Bank Statement'],
    },
    hi: {
      category: 'महिला एवं अजा/अजजा वित्त',
      max_loan: '₹10 लाख से ₹1 करोड़',
      interest: 'आधार दर + न्यूनतम बैंक दर',
      tenure: '7 वर्ष तक',
      subsidy: 'परियोजना लागत के 85% तक समग्र ऋण सहायता',
      who: 'पहली बार नया (ग्रीनफील्ड) उद्यम स्थापित करने वाली महिला और अनुसूचित जाति/जनजाति (SC/ST) उद्यमी',
      benefit: 'परियोजना लागत के 85% तक उपकरण और कार्यशील पूंजी के लिए ₹10 लाख से ₹1 करोड़ तक का समग्र बैंक ऋण।',
      eligibility_criteria: 'विनिर्माण, सेवा, व्यापार या कृषि से संबद्ध गतिविधियों में ग्रीनफील्ड उद्यम स्थापित करने वाले SC/ST और महिला उद्यमियों के लिए। गैर-व्यक्तिगत संस्थाओं में 51% हिस्सेदारी SC/ST या महिला की होनी चाहिए।',
      docs: ['पहचान और पते का प्रमाण', 'जाति प्रमाण पत्र (SC/ST के लिए) या महिला स्वामित्व प्रमाण (51%+)', 'विस्तृत परियोजना रिपोर्ट (DPR)', 'आवश्यक अनापत्ति / लाइसेंस', 'बैंक विवरण'],
    },
    gu: {
      category: 'મહિલા અને SC/ST ધિરાણ',
      max_loan: '₹૧૦ લાખ થી ₹૧ કરોડ',
      interest: 'બેઝ રેટ + ન્યૂનતમ બેંક દર',
      tenure: '૭ વર્ષ સુધી',
      subsidy: 'પ્રોજેક્ટ ખર્ચના ૮૫% સુધી કમ્પોઝિટ લોન સહાય',
      who: 'પ્રથમ વખત નવો (ગ્રીનફીલ્ડ) વ્યવસાય શરૂ કરતી મહિલા અને SC/ST ઉદ્યોગસાહસિકો',
      benefit: 'પ્રોજેક્ટ ખર્ચના ૮૫% સુધી સાધનો અને કાર્યકારી મૂડી માટે ₹૧૦ લાખથી ₹૧ કરોડ સુધીની કમ્પોઝિટ લોન.',
      eligibility_criteria: 'ઉત્પાદન, સેવા, વેપાર કે કૃષિ સંલગ્ન ક્ષેત્રમાં ગ્રીનફીલ્ડ સાહસ શરૂ કરતા SC/ST અને મહિલા ઉદ્યોગસાહસિકો માટે. બિન-વ્યક્તિગત સંસ્થામાં ૫૧% હિસ્સો SC/ST કે મહિલાનો હોવો જરૂરી છે.',
      docs: ['ઓળખ અને સરનામાનો પુરાવો', 'જાતિનું પ્રમાણપત્ર (SC/ST માટે) અથવા મહિલા માલિકી પુરાવો', 'પ્રોજેક્ટ રિપોર્ટ (DPR)', 'જરૂરી લાયસન્સ / મંજૂરીઓ', 'બેંક સ્ટેટમેન્ટ'],
    },
  },

  PMKUSUM: {
    en: {
      category: 'Renewable Energy & Agri',
      max_loan: 'Covers up to 90% project cost (subsidy + loan)',
      interest: 'Refinance bank lending rate',
      tenure: '5 to 10 years',
      subsidy: 'Up to 60% subsidy (30% Central + 30% State)',
      who: 'Farmers, farmer groups, cooperatives, Panchayats, FPOs, and Water User Associations',
      benefit: 'Subsidized solar water pumps and renewable solar power plants, reducing irrigation costs and diesel usage.',
      eligibility_criteria: 'For Component-A, eligible applicants include individual farmers, groups of farmers, cooperatives, panchayats, FPOs and Water User Associations. The cited state implementation guidance requires the proposed land to be within 5 km of the nearest electricity sub-station. Other components have different rules.',
      docs: ['Farmer Land Record (Khasra/Khatauni)', 'Aadhaar Card', 'Bank Account Details', 'Electricity Connection / Substation Distance Certificate', 'Passport Photo'],
    },
    hi: {
      category: 'नवीकरणीय ऊर्जा एवं कृषि',
      max_loan: 'परियोजना लागत का 90% तक (सब्सिडी + ऋण)',
      interest: 'नाबार्ड / बैंक पुनर्वित्त दर',
      tenure: '5 से 10 वर्ष',
      subsidy: '60% तक कुल सब्सिडी (30% केंद्र + 30% राज्य)',
      who: 'व्यक्तिगत किसान, किसान समूह, सहकारी समितियां, पंचायतें, FPO और जल उपभोक्ता संघ',
      benefit: 'कृषि सिंचाई के लिए सौर जल पंपों और ग्रिड से जुड़े सौर ऊर्जा संयंत्रों पर 60% तक की भारी सरकारी सब्सिडी।',
      eligibility_criteria: 'घटक-ए के लिए पात्र आवेदकों में किसान, समूह, सहकारी समितियां, पंचायतें और FPO शामिल हैं। प्रस्तावित भूमि निकटतम बिजली सब-स्टेशन से 5 किमी के दायरे में होनी चाहिए। सौर पंप घटक के लिए वैध कृषि भूमि आवश्यक है।',
      docs: ['भूमि अभिलेख (खसरा / खतौनी)', 'आधार कार्ड', 'बैंक खाता विवरण', 'बिजली सब-स्टेशन दूरी प्रमाण पत्र', 'पासपोर्ट फोटो'],
    },
    gu: {
      category: 'રિન્યુએબલ એનર્જી અને કૃષિ',
      max_loan: 'પ્રોજેક્ટ ખર્ચના ૯૦% સુધી (સબસિડી + લોન)',
      interest: 'નાબાર્ડ / બેંક પુનર્ધિરાણ દર',
      tenure: '૫ થી ૧૦ વર્ષ',
      subsidy: '૬૦% સુધી કુલ સબસિડી (૩૦% કેન્દ્ર + ૩૦% રાજ્ય)',
      who: 'વ્યક્તિગત ખેડૂતો, ખેડૂત જૂથો, સહકારી મંડળીઓ, પંચાયતો, FPO અને જળ વપરાશકાર મંડળો',
      benefit: 'કૃષિ સિંચાઈ માટે સોલર પંપ અને સોલર પાવર પ્લાન્ટ પર ૬૦% સુધીની સરકારી સબસિડી, ડીઝલ ખર્ચમાં રાહત.',
      eligibility_criteria: 'કમ્પોનન્ટ-એ માટે પાત્ર અરજદારોમાં ખેડૂતો, જૂથો, મંડળીઓ, પંચાયતો અને FPO નો સમાવેશ થાય છે. જમીન નજીકના વીજ સબ-સ્ટેશનથી ૫ કિમીની ત્રિજ્યામાં હોવી જોઈએ. સોલર પંપ માટે માન્ય કૃષિ જમીન જરૂરી છે.',
      docs: ['જમીન દસ્તાવેજ (૭/૧૨, ૮-અ)', 'આધાર કાર્ડ', 'બેંક ખાતાની વિગતો', 'સબ-સ્ટેશન અંતરનું પ્રમાણપત્ર', 'પાસપોર્ટ ફોટો'],
    },
  },

  NLM: {
    en: {
      category: 'Livestock & Poultry',
      max_loan: 'Project based (up to ₹1 Crore)',
      interest: 'Commercial bank rate',
      tenure: '5 to 8 years',
      subsidy: '50% capital subsidy (up to ₹25–50 Lakh)',
      who: 'Individuals, FPOs, SHGs, Section 8 companies in livestock & poultry',
      benefit: 'Direct 50% back-ended capital subsidy up to ₹50 Lakh for rural poultry hatcheries, breeding farms, and feed plants.',
      eligibility_criteria: 'Entrepreneurship components cover specified rural poultry, sheep/goat, piggery and feed/fodder activities. Eligible applicant types include individuals and organisations such as FPOs, SHGs and Section 8 companies, subject to activity-specific conditions.',
      docs: ['Detailed Project Report (DPR)', 'Land Ownership or 10-year Lease Deed', 'Training Certificate in Animal Husbandry / Poultry', 'Aadhaar & PAN', 'Bank Loan Sanction Letter'],
    },
    hi: {
      category: 'पशुधन एवं कुक्कुट पालन',
      max_loan: 'परियोजना आधारित (₹1 करोड़ तक)',
      interest: 'वाणिज्यिक बैंक ब्याज दर',
      tenure: '5 से 8 वर्ष',
      subsidy: '50% सीधी पूंजीगत सब्सिडी (₹50 लाख तक)',
      who: 'ग्रामीण कुक्कुट, भेड़/बकरी, सुअर और पशु आहार में काम करने वाले व्यक्ति, FPO, SHG और धारा 8 कंपनियां',
      benefit: 'कुक्कुट पालन, प्रजनन फार्म और पशु चारा इकाइयों की स्थापना के लिए 50% सीधी पूंजीगत सब्सिडी (₹50 लाख तक)।',
      eligibility_criteria: 'उद्यमिता घटक में ग्रामीण कुक्कुट, भेड़/बकरी पालन और चारा बुनियादी ढांचा शामिल है। व्यक्तियों और संस्थाओं के पास आवश्यक भूमि, बुनियादी ढांचा और पशुपालन प्रशिक्षण होना चाहिए।',
      docs: ['विस्तृत परियोजना रिपोर्ट (DPR)', 'भूमि स्वामित्व या 10 वर्ष का पट्टा विलेख', 'पशुपालन / कुक्कुट प्रशिक्षण प्रमाण पत्र', 'आधार और पैन कार्ड', 'बैंक ऋण स्वीकृति पत्र'],
    },
    gu: {
      category: 'પશુપાલન અને મરઘાં પાલન',
      max_loan: 'પ્રોજેક્ટ આધારિત (₹૧ કરોડ સુધી)',
      interest: 'કોમર્શિયલ બેંક વ્યાજ દર',
      tenure: '૫ થી ૮ વર્ષ',
      subsidy: '૫૦% સીધી મૂડી સબસિડી (₹૫૦ લાખ સુધી)',
      who: 'ગ્રામીણ મરઘાં, ઘેટાં/બકરાં અને પશુ આહાર ક્ષેત્રે કાર્યરત વ્યક્તિઓ, FPO, SHG અને કંપનીઓ',
      benefit: 'મરઘાં પાલન, બ્રીડિંગ ફાર્મ અને પશુ આહાર પ્લાન્ટ માટે ૫૦% સીધી મૂડી સબસિડી (₹૫૦ લાખ સુધી).',
      eligibility_criteria: 'ઉદ્યોગસાહસિકતા ઘટકમાં ગ્રામીણ મરઘાં, ઘેટાં/બકરાં અને ઘાસચારો સામેલ છે. વ્યક્તિઓ અને સંસ્થાઓ પાસે યોગ્ય જમીન અને પશુપાલન તાલીમ હોવી જરૂરી છે.',
      docs: ['વિગતવાર પ્રોજેક્ટ રિપોર્ટ (DPR)', 'જમીન માલિકી અથવા ૧૦ વર્ષનો ભાડાકરાર', 'પશુપાલન તાલીમ પ્રમાણપત્ર', 'આધાર અને પાન કાર્ડ', 'બેંક લોન મંજૂરી પત્ર'],
    },
  },

  PMMSY: {
    en: {
      category: 'Fisheries & Aquaculture',
      max_loan: 'Activity based (up to ₹25–50 Lakh)',
      interest: 'Normal bank lending rate',
      tenure: '3 to 7 years',
      subsidy: '40% General / 60% SC/ST/Women subsidy',
      who: 'Fishers, fish farmers, fisheries SHGs, JLGs, and aquaculture entrepreneurs',
      benefit: 'Modern aquaculture support, biofloc units, pond construction, and refrigerated transport with 40%–60% subsidy.',
      eligibility_criteria: 'Eligibility is activity-specific. Beneficiary-oriented components can cover individuals and groups/entities in fisheries; assistance differs by activity and applicant category. Current state fisheries notifications must be checked before final eligibility.',
      docs: ['Fisherman / Aquaculture ID or Land/Pond Waterbody Lease', 'Aadhaar Card', 'DPR for Fisheries Activity', 'Bank Passbook', 'Caste / Category Certificate (if applicable)'],
    },
    hi: {
      category: 'मत्स्य पालन एवं जलीय कृषि',
      max_loan: 'गतिविधि आधारित (₹25–50 लाख तक)',
      interest: 'सामान्य बैंक ऋण दर',
      tenure: '3 से 7 वर्ष',
      subsidy: '40% सामान्य / 60% महिला एवं अजा/अजजा सब्सिडी',
      who: 'मछुआरे, मछली पालक, स्वयं सहायता समूह (SHG), संयुक्त देयता समूह और मत्स्य उद्यमी',
      benefit: 'तालाब निर्माण, बायोफ्लॉक इकाइयों, मछली चारा मिल और शीतगृह वाहनों के लिए 40% से 60% तक पूंजीगत सब्सिडी।',
      eligibility_criteria: 'पात्रता गतिविधि-विशिष्ट है। मत्स्य पालन में संलग्न व्यक्ति और समूह पात्र हैं। सामान्य वर्ग के लिए 40% तथा महिला और SC/ST वर्ग के लिए 60% तक वित्तीय सहायता दी जाती है।',
      docs: ['मछुआरा पहचान पत्र या तालाब/जलाशय पट्टा विलेख', 'आधार कार्ड', 'मत्स्य पालन परियोजना रिपोर्ट (DPR)', 'बैंक पासबुक', 'जाति / श्रेणी प्रमाण पत्र (यदि लागू हो)'],
    },
    gu: {
      category: 'મત્સ્ય પાલન અને એક્વાકલ્ચર',
      max_loan: 'પ્રવૃત્તિ આધારિત (₹૨૫–૫૦ લાખ સુધી)',
      interest: 'સામાન્ય બેંક લોન દર',
      tenure: '૩ થી ૭ વર્ષ',
      subsidy: '૪૦% સામાન્ય / ૬૦% મહિલા અને SC/ST સબસિડી',
      who: 'માછીમારો, મત્સ્ય પાલકો, સ્વ-સહાય જૂથો (SHG), JLG અને એક્વાકલ્ચર ઉદ્યોગસાહસિકો',
      benefit: 'તળાવ નિર્માણ, બાયોફ્લોક યુનિટ્સ, ફીડ મિલ અને કોલ્ડ ચેઇન વાહનો માટે ૪૦% થી ૬૦% સુધીની સબસિડી.',
      eligibility_criteria: 'પાત્રતા પ્રવૃત્તિ આધારિત છે. માછીમારી અને મત્સ્ય પાલનમાં જોડાયેલા વ્યક્તિઓ અને જૂથો પાત્ર છે. સામાન્ય શ્રેણી માટે ૪૦% અને મહિલા/SC/ST માટે ૬૦% સરકારી સહાય.',
      docs: ['માછીમાર ઓળખપત્ર અથવા તળાવ ભાડાકરાર', 'આધાર કાર્ડ', 'મત્સ્ય પાલન પ્રોજેક્ટ રિપોર્ટ (DPR)', 'બેંક પાસબુક', 'જાતિ / કેટેગરી પ્રમાણપત્ર (જો લાગુ હોય)'],
    },
  },

  PMFBY: {
    en: {
      category: 'Crop Insurance',
      max_loan: 'Full crop sum insured',
      interest: 'N/A (Crop Insurance)',
      tenure: 'Per crop season',
      subsidy: 'Farmers pay only 1.5% to 5% premium',
      who: 'All farmers including sharecroppers and tenant farmers growing notified crops in notified areas',
      benefit: 'Comprehensive yield insurance against natural perils, drought, and post-harvest losses with direct DBT claim settlement.',
      eligibility_criteria: 'Farmers including sharecroppers and tenant farmers growing notified crops in notified areas are eligible when they have insurable interest and provide required land/tenancy/crop documents. Current season and state crop notifications apply.',
      docs: ['Land Possession Certificate / Patta / Tenancy Agreement', 'Crop Sowing Certificate / Declaration', 'Aadhaar Card', 'Bank Account Details (linked to Aadhaar)'],
    },
    hi: {
      category: 'फसल बीमा',
      max_loan: 'पूर्ण फसल बीमित राशि',
      interest: 'लागू नहीं (फसल बीमा)',
      tenure: 'प्रति फसल मौसम',
      subsidy: 'किसान केवल 1.5% से 5% प्रीमियम देते हैं',
      who: 'अधिसूचित क्षेत्रों में अधिसूचित फसलें उगाने वाले सभी किसान, जिनमें बटाईदार और काश्तकार शामिल हैं',
      benefit: 'प्राकृतिक आपदाओं, सूखे, बाढ़ और फसल कटाई उपरांत नुकसान के विरुद्ध व्यापक बीमा। किसान को मात्र 1.5% से 5% प्रीमियम देना होता है।',
      eligibility_criteria: 'अधिसूचित क्षेत्रों में अधिसूचित फसल उगाने वाले और मान्य भूमि/काश्तकारी दस्तावेज प्रस्तुत करने वाले किसान पात्र हैं। राज्य सरकार की वर्तमान मौसम अधिसूचना लागू होती है।',
      docs: ['भूमि अभिलेख / पट्टा / बटाईदारी अनुबंध', 'फसल बुवाई स्व-घोषणा पत्र', 'आधार कार्ड', 'बैंक खाता पासबुक (आधार लिंक)'],
    },
    gu: {
      category: 'પાક વીમો',
      max_loan: 'સંપૂર્ણ પાક વીમા રકમ',
      interest: 'લાગુ પડતું નથી (પાક વીમો)',
      tenure: 'પ્રતિ પાક સીઝન',
      subsidy: 'ખેડૂતો માત્ર ૧.૫% થી ૫% પ્રીમિયમ ચૂકવે છે',
      who: 'સૂચિત વિસ્તારોમાં સૂચિત પાક ઉગાડતા તમામ ખેડૂતો, જેમાં ભાગિયા અને ગણોતિયા સામેલ છે',
      benefit: 'કુદરતી આફતો, દુષ્કાળ, પૂર અને પાક લણણી પછીના નુકસાન સામે સંપૂર્ણ સુરક્ષા. ખેડૂતે માત્ર ૧.૫% થી ૫% પ્રીમિયમ ચૂકવવાનું રહે છે.',
      eligibility_criteria: 'સૂચિત વિસ્તારમાં સૂચિત પાક ઉગાડતા અને માન્ય જમીન/ગણોત દસ્તાવેજો ધરાવતા ખેડૂતો પાત્ર છે. રાજ્ય સરકારની ચાલુ સીઝનની સૂચનાઓ લાગુ પડે છે.',
      docs: ['જમીન માલિકી પુરાવો / પટ્ટો / ભાગીદારી કરાર', 'પાક વાવણીનું ઘોષણાપત્ર', 'આધાર કાર્ડ', 'બેંક પાસબુક (આધાર લિંક)'],
    },
  },
};

const BIZ_NAME_I18N = {
  dairy: { hi: 'डेयरी', gu: 'ડેરી' },
  poultry: { hi: 'कुक्कुट पालन', gu: 'મરઘાં પાલન' },
  fisheries: { hi: 'मत्स्य पालन', gu: 'મત્સ્ય પાલન' },
  fishery: { hi: 'मत्स्य पालन', gu: 'મત્સ્ય પાલન' },
  agriculture: { hi: 'कृषि', gu: 'કૃષિ' },
  farming: { hi: 'खेती/कृषि', gu: 'ખેતી / કૃષિ' },
  'food processing': { hi: 'खाद्य प्रसंस्करण', gu: 'ફૂડ પ્રોસેસિંગ' },
  food: { hi: 'खाद्य व्यवसाय', gu: 'ખાદ્ય વ્યવસાય' },
  retail: { hi: 'खुदरा दुकान', gu: 'રિટેલ દુકાન' },
  'retail shop': { hi: 'खुदरा दुकान', gu: 'રિટેલ દુકાન' },
  textile: { hi: 'वस्त्र एवं सिलाई', gu: 'કાપડ અને સિલાઈ' },
  tailoring: { hi: 'सिलाई एवं वस्त्र', gu: 'સિલાઈ અને કાપડ' },
  goat: { hi: 'बकरी पालन', gu: 'બકરી પાલન' },
  livestock: { hi: 'पशुपालन', gu: 'પશુપાલન' },
};

/**
 * Localize dynamic recommendation reasons based on language, scheme ID, and user business.
 */
export function getLocalizedRelevanceReason(schemeId, userBusiness = '', location = '', lang = 'en') {
  const code = getLangCode(lang);
  const sId = (schemeId || '').toString().trim().toUpperCase();
  const rawBiz = userBusiness || '';
  let biz = rawBiz;

  if (rawBiz && (code === 'hi' || code === 'gu')) {
    const key = rawBiz.toLowerCase().trim();
    if (BIZ_NAME_I18N[key] && BIZ_NAME_I18N[key][code]) {
      biz = BIZ_NAME_I18N[key][code];
    } else {
      // Partial matching for combined terms
      for (const [k, v] of Object.entries(BIZ_NAME_I18N)) {
        if (key.includes(k) && v[code]) {
          biz = v[code];
          break;
        }
      }
    }
  }

  if (code === 'hi') {
    const locStr = location ? ` ${location} में लागू।` : '';
    switch (sId) {
      case 'KCC':
        return `आपके '${biz || 'डेयरी/कृषि'}' उद्यम के लिए सीधे उपयुक्त; सस्ती 4% ब्याज दर पर कार्यशील पूंजी ऋण।${locStr}`;
      case 'PMEGP':
        return `आपके नए '${biz || 'सूक्ष्म'}' उद्यम के लिए 25%–35% ग्रामीण मार्जिन मनी सरकारी सब्सिडी।${locStr}`;
      case 'PMMY':
        return `आपके '${biz || 'सूक्ष्म'}' व्यवसाय के लिए बिना किसी गारंटी ₹20 लाख तक का कार्यशील पूंजी और उपकरण ऋण।${locStr}`;
      case 'PMVISHWAKARMA':
        return `पारंपरिक शिल्प कौशल के लिए ₹15,000 आधुनिक टूलकिट और 5% रियायती ब्याज दर पर ऋण सहायता।${locStr}`;
      case 'PMFME':
        return `खाद्य प्रसंस्करण व्यवसाय के लिए 35% पूंजीगत सब्सिडी (अधिकतम ₹10 लाख) और ब्रांडिंग सहयोग।${locStr}`;
      case 'STANDUP_INDIA':
      case 'STANDUP':
        return `महिला और अजा/अजजा उद्यमियों के लिए ₹10 लाख से ₹1 करोड़ तक का समग्र बैंक ऋण।${locStr}`;
      case 'PMKUSUM':
        return `कृषि सिंचाई लागत घटाने हेतु सौर ऊर्जा वाटर पंपों पर 60% तक सरकारी सब्सिडी।${locStr}`;
      case 'NLM':
        return `ग्रामीण कुक्कुट और पशुधन फार्म स्थापित करने हेतु 50% सीधी पूंजीगत सब्सिडी (₹50 लाख तक)।${locStr}`;
      case 'PMMSY':
        return `मत्स्य पालन और जलीय कृषि अवसंरचना के लिए 40% से 60% पूंजीगत सब्सिडी।${locStr}`;
      case 'PMFBY':
        return `प्रतिकूल मौसम और सूखा/बाढ़ से फसल नुकसान के विरुद्ध व्यापक बीमा सुरक्षा।${locStr}`;
      default:
        return `आपकी प्रोफाइल के अनुसार पात्र सरकारी योजना।${locStr}`;
    }
  }

  if (code === 'gu') {
    const locStr = location ? ` ${location} માં લાગુ.` : '';
    switch (sId) {
      case 'KCC':
        return `તમારા '${biz || 'ડેરી/કૃષિ'}' સાહસ માટે સીધું ઉપયોગી; રાહત દરે ૪% વ્યાજે કાર્યકારી મૂડી લોન.${locStr}`;
      case 'PMEGP':
        return `તમારા નવા '${biz || 'સૂક્ષ્મ'}' ઉદ્યોગ માટે ૨૫%–૩૫% ગ્રામીણ માર્જિન મની સરકારી સબસિડી.${locStr}`;
      case 'PMMY':
        return `તમારા '${biz || 'સૂક્ષ્મ'}' વ્યવસાય માટે કોઈપણ ગેરંટી વગર ₹૨૦ લાખ સુધીની લોન સહાય.${locStr}`;
      case 'PMVISHWAKARMA':
        return `પરંપરાગત કારીગરો માટે ₹૧૫,૦૦૦ ટૂલકિટ સહાય અને ૫% ના રાહત દરે લોન.${locStr}`;
      case 'PMFME':
        return `ફૂડ પ્રોસેસિંગ એકમ માટે ૩૫% મૂડી સબસિડી (મહત્તમ ₹૧૦ લાખ) અને બ્રાન્ડિંગ સહાય.${locStr}`;
      case 'STANDUP_INDIA':
      case 'STANDUP':
        return `મહિલા અને SC/ST ઉદ્યોગસાહસિકો માટે ₹૧૦ લાખ થી ₹૧ કરોડ સુધીની કમ્પોઝિટ બેંક લોન.${locStr}`;
      case 'PMKUSUM':
        return `સિંચાઈ ખર્ચ ઘટાડવા ખેતીના સોલર પંપ પર ૬૦% સુધીની સરકારી સબસિડી.${locStr}`;
      case 'NLM':
        return `ગ્રામીણ મરઘાં અને પશુપાલન એકમ સ્થાપવા માટે ૫૦% સીધી મૂડી સબસિડી (₹૫૦ લાખ સુધી).${locStr}`;
      case 'PMMSY':
        return `મત્સ્ય પાલન અને એક્વાકલ્ચર માળખાકીય સુવિધાઓ માટે ૪૦% થી ૬૦% સબસિડી.${locStr}`;
      case 'PMFBY':
        return `કુદરતી આફતો સામે પાક નુકસાની માટે વ્યાપક વીમા સુરક્ષા.${locStr}`;
      default:
        return `તમારી પ્રોફાઇલ મુજબ પાત્ર સરકારી યોજના.${locStr}`;
    }
  }

  // English fallback
  const locStr = location ? ` Applicable in ${location}.` : '';
  switch (sId) {
    case 'KCC':
      return `Directly supports your selected '${biz || 'Dairy'}' venture; Lowest 4% effective interest rate for working capital in dairy and allied farming.${locStr}`;
    case 'PMEGP':
      return `Provides substantial 25%–35% rural margin money subsidy for new units.${locStr}`;
    case 'PMMY':
      return `Universal collateral-free financing up to ₹20 Lakh for rural micro and small enterprises.${locStr}`;
    case 'PMVISHWAKARMA':
      return `₹15,000 modern tool kit + 5% subsidized credit for skilled traditional crafts.${locStr}`;
    case 'PMFME':
      return `Provides 35% capital subsidy up to ₹10 Lakh for food processing.${locStr}`;
    case 'STANDUP_INDIA':
    case 'STANDUP':
      return `Priority composite funding from ₹10 Lakh to ₹1 Crore for Women and SC/ST entrepreneurs.${locStr}`;
    case 'PMKUSUM':
      return `Subsidizes up to 60% of solar pump costs for agricultural water supply.${locStr}`;
    case 'NLM':
      return `Direct 50% capital subsidy (up to ₹25–50 Lakh) for poultry and livestock breeding.${locStr}`;
    case 'PMMSY':
      return `40% to 60% capital subsidy dedicated to fisheries and aquaculture units.${locStr}`;
    case 'PMFBY':
      return `Shields your crop investment against adverse weather and yield loss.${locStr}`;
    default:
      return `Eligible rural enterprise scheme based on your profile.${locStr}`;
  }
}

/**
 * Return an enriched scheme object localized to the active language.
 */
export function getLocalizedScheme(scheme, lang = 'en', userProfile = null) {
  if (!scheme) return scheme;
  const code = getLangCode(lang);
  const rawId = (scheme.scheme_id || scheme.id || '').toString().trim().toUpperCase();
  let sId = rawId === 'STAND-UP_INDIA' || rawId === 'STAND_UP_INDIA' || rawId === 'STANDUP' ? 'STANDUP_INDIA' : rawId;

  if (!SCHEME_LOCALIZED_DATA[sId]) {
    const nameStr = (scheme.name || scheme.scheme_name || '').toUpperCase();
    for (const key of Object.keys(SCHEME_LOCALIZED_DATA)) {
      if (nameStr.includes(key)) {
        sId = key;
        break;
      }
    }
  }

  const localizedMeta = (SCHEME_LOCALIZED_DATA[sId] && SCHEME_LOCALIZED_DATA[sId][code]) || null;

  const loc = userProfile?.district ? `${userProfile.district}, ${userProfile.state || ''}`.trim() : '';
  const biz = userProfile?.business || userProfile?.business_interest || '';

  const localizedReason = getLocalizedRelevanceReason(sId, biz, loc, code);

  // Localize eligibility questions
  const rawQuestions = scheme.eligibility_questions || scheme.eligibility || [];
  const localizedQuestions = rawQuestions.map(q => getLocalizedQuestion(q, code));

  // Localize docs
  const localizedDocs = localizedMeta?.docs || scheme.docs || [];

  return {
    ...scheme,
    who: localizedMeta?.who || scheme.who,
    benefit: localizedMeta?.benefit || scheme.benefit,
    eligibility_criteria: localizedMeta?.eligibility_criteria || scheme.eligibility_criteria,
    maxLoan: localizedMeta?.max_loan || scheme.maxLoan || scheme.max_loan,
    max_loan: localizedMeta?.max_loan || scheme.max_loan || scheme.maxLoan,
    interest: localizedMeta?.interest || scheme.interest || scheme.interest_rate,
    interest_rate: localizedMeta?.interest || scheme.interest_rate || scheme.interest,
    tenure: localizedMeta?.tenure || scheme.tenure,
    subsidy: localizedMeta?.subsidy || scheme.subsidy,
    category: localizedMeta?.category || scheme.category,
    docs: localizedDocs,
    eligibility: localizedQuestions,
    eligibility_questions: localizedQuestions,
    relevance_reason: localizedReason || scheme.relevance_reason,
  };
}
