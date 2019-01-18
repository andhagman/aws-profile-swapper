const program = require('commander');
const chalk = require('chalk');
const fs = require('fs');

const home = process.env['HOME']

program
    .version('0.1.0')
    .option('-p, --profile', 'Name of the AWS profile')
    .option('-r, --region', 'Set the target region')
    .parse(process.argv);

if (!program.profile) {
    console.error(chalk.red("Missing required argument: -p <profile-name>"))
}

const profileName = program.args[0];
const region = program.args[1] || 'eu-west-1';

const getProfiles = () => {
    return new Promise((resolve, reject) => {
        fs.readFile(`${home}/.aws/credentials`, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};

const setProfile = (data) => {
    const match = data.match(`[${profileName}]`);
    if (!match) {
        console.log(`${profileName} not found in .aws/credentials`);
        return;
    }

    const values = data.match(/([enfo])(.+)(\n\n)/)[1]


    console.log(values)

}


getProfiles()
  .then(setProfile)
  .catch(error => {
    console.log('Error:', error);
    process.exit(1);
  });


