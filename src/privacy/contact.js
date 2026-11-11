export const PRIVACY_CONTACT=Object.freeze({operator:'Orbit Studio',email:'gamer.robot.in@gmail.com',grievanceDays:90});
export const REQUEST_TYPES=Object.freeze({access:'Access my personal data',correct:'Correct or update my personal data',erase:'Delete my personal data',withdraw:'Withdraw consent for personal data',complaint:'Privacy complaint',nomination:'Nomination request',other:'Other privacy question'});
export function requestEmail(kind='other',message=''){
 const type=REQUEST_TYPES[kind]||REQUEST_TYPES.other;
 return `mailto:${PRIVACY_CONTACT.email}?subject=${encodeURIComponent('Orbit Studio: '+type)}&body=${encodeURIComponent('Request: '+type+'\n\n'+String(message).trim()+'\n\nPlease reply to the email address I send this request from.')}`;
}
