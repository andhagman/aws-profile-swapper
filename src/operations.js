const inquirer = require('inquirer');
const profiles = require('./profiles');

const operations = {
    Configure: "Configure",
    Profile: "Change profile"
};

exports.prompt = async () => {
    const questions = [
        {
            type: "list",
            name: "OPERATION",
            message: "Choose an operation",
            choices: [ ...Object.values(operations)], 
        },
    ];

    const answer = await inquirer.prompt(questions);
    await handleOperations(answer);
};

const handleOperations = async ({ OPERATION }) => {
    switch (OPERATION){
        case operations.Configure: {
            console.log('Configuring something..');
            break;
        }
        case operations.Profile: {
            await profiles.prompt();
            break;
        }
    }
}
