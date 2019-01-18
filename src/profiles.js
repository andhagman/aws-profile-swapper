const inquirer = require('inquirer');
const fs = require('fs');
const shell = require('shelljs');
const homeDir = process.env['HOME']
const profileRegex = /\[.*]/g;
const bracketsRemovalRegx = /(\[| )|(\])/g;

exports.prompt = async () => {
    const data = await getProfiles();

    const matches = data.match(profileRegex);

    if (!matches) {
        console.log('No profiles found.');
        return;
    }

    const profiles = matches.map((match) => {
        return match.replace(bracketsRemovalRegx, '');
    });


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

const changeProfile = ({ PROFILE }) => {
    console.log(PROFILE)
    // aws_access_key_id,  aws_secret_access_key, aws_session_token, region
    // check if MFA
}

const setProfile = async ({ aws_access_key_id,  aws_secret_access_key, aws_session_token, region  }) => {
    shell.exec('aws configure set aws_access_key_id ' + aws_access_key_id);
    shell.exec('aws configure set aws_secret_access_key ' + aws_secret_access_key)
    shell.exec('aws configure set aws_session_token ' + aws_session_token)
    shell.exec('aws configure set region ' + region || 'eu-west-1');  
}

const exportEnvironment = () => {
    // Export key id, session token and sercret key.
}

const getProfiles = () => {
    return new Promise((resolve, reject) => {
        fs.readFile(`${homeDir}/.aws/credentials`, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};