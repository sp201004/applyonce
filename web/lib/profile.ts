export interface Education {
  collegeName: string;
  branch?: string;
  degree: string;
  gpa: string;
  startDate: string;
  endDate: string;
  currentlyStudyHere: boolean;
}

export interface WorkExperience {
  company: string;
  jobTitle: string;
  location: string;
  startDate: string;
  endDate: string;
  currentlyWorkHere: boolean;
  summary: string;
  bullets: string[];
}

export interface UserProfile {
  firstName: string;
  middleName: string;
  lastName: string;
  preferredFirstName: string;
  preferredMiddleName: string;
  preferredLastName: string;
  email: string;
  phoneType: string;
  countryCode: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  nationality: string;
  zip: string;
  country: string;
  linkedin: string;
  github: string;
  website: string;
  x: string;
  medium: string;
  leetcode: string;
  gfg: string;
  education: Education[];
  workExperience: WorkExperience[];
  skills: string[];
  languages: string[];
  certificates: string[];
  workAuthIndia: string;
  requireSponsorship: string;
  disability: string;
  veteran: string;
  gender: string;
  lgbtq: string;
  hispanicLatino: string;
  race: string;
  sexualOrientation: string;
  pronouns: string;
  expectedSalary: string;
  availableStartDate: string;
  dateOfBirth: string;
  additionalInfo: string;
  achievements: string;
}

export function emptyProfile(): UserProfile {
  return {
    firstName: '', middleName: '', lastName: '',
    preferredFirstName: '', preferredMiddleName: '', preferredLastName: '',
    email: '', phoneType: '', countryCode: '', phone: '',
    address: '', city: '', state: '', nationality: '', zip: '', country: '',
    linkedin: '', github: '', website: '', x: '', medium: '', leetcode: '', gfg: '',
    education: [], workExperience: [], skills: [], languages: [], certificates: [],
    workAuthIndia: '', requireSponsorship: '', disability: '', veteran: '',
    gender: '', lgbtq: '', hispanicLatino: '', race: '', sexualOrientation: '', pronouns: '',
    expectedSalary: '', availableStartDate: '', dateOfBirth: '', additionalInfo: '', achievements: ''
  };
}
