// Red Blood Cell Compatibility Matrix
// Key = Requesting Recipient's Blood Group
// Values = Array of Compatible Donor Blood Groups

const compatibilityMap = {
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal Recipient
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'A+':  ['O-', 'O+', 'A-', 'A+'],
    'A-':  ['O-', 'A-'],
    'B+':  ['O-', 'O+', 'B-', 'B+'],
    'B-':  ['O-', 'B-'],
    'O+':  ['O-', 'O+'],
    'O-':  ['O-'] // Universal Donor, but can only receive O-
};

/**
 * Returns an array of donor blood groups that are compatible with the recipient.
 * @param {string} recipientBloodGroup 
 * @returns {string[]} Array of compatible blood groups
 */
export const getCompatibleDonorsFor = (recipientBloodGroup) => {
    return compatibilityMap[recipientBloodGroup] || [];
};

/**
 * Returns an array of recipient blood groups that a donor can donate to.
 * @param {string} donorBloodGroup 
 * @returns {string[]} Array of compatible blood groups
 */
export const getCompatibleRecipientsFor = (donorBloodGroup) => {
    const compatibleRecipients = [];
    for (const [recipient, donors] of Object.entries(compatibilityMap)) {
        if (donors.includes(donorBloodGroup)) {
            compatibleRecipients.push(recipient);
        }
    }
    return compatibleRecipients;
};
