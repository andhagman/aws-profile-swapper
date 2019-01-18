const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');


const init = () => {
    console.log(
        chalk.default(
            figlet.textSync("AWS Profile Swapper", {
                horizontalLayout: "default",
                verticalLayout: "default"
            })
        )
    );
};

const promptOperation = async () => {
    const questions = [
        {
            type: "list",
            name: "OPERATION",
            message: "Choose a profile",
            choices: [ "Profile-1", "Profile-2"], 
        },
    ];

    const answer = await inquirer.prompt(questions);
    await handleAnswer(answer);
};



const handleAnswer = async ({ OPERATION }) => {
    switch (OPERATION) {
        case 'Profile-1':
            console.log('Changed to Profile-1');
            break;
        case 'Profile-2':
            console.log('Changed to Profile-1');
            break;
        default:
            success('Done...')
    }
}

const success = res => {
    console.log(
        chalk.default(res)
    );
};

const run = async () => {
    await promptOperation();
};

init();
run();
