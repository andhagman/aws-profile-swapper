const inquirer = require('inquirer');

exports.prompt = async () => {
    const profiles = getProfiles();

    const questions = [
        {
            type: "list",
            name: "PROFILE",
            message: "Choose an AWS profile",
            choices: profiles,
        },
    ];

    const answer = await inquirer.prompt(questions);
    await changeProfile(answer);
};

const changeProfile = async ({ PROFILE }) => {
    console.log(`Changed to ${PROFILE}..`);
}

const getProfiles = () => {
    return ['Profile-1', 'Profile-2']
}