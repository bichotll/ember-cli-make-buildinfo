/* jshint node: true */

// https://github.com/walter/ember-cli-make-concoction
// https://gist.github.com/novaugust/9d0133588fc29844afaf
// https://github.com/heyjinkim/ember-cli-index-fragment/blob/master/index.js

var path = require('path');
var fs = require('fs');
var execSync = require('child_process').execSync; // node 0.12
var git = require('git-rev');
var RSVP = require('rsvp');

/*
 *[App Name]
 *configuration=test
 *built_by=davidmcnamara
 *build_date=Thu Feb 12 2015 17:05:17 GMT+0000 (GMT)
 *build_dir=/Users/davidmcnamara/workspace/client-hg
 *build_host=dmcnamara-imac.local
 *branch=default
 *revision=hg:client:185:365c0862bdc5
 *tag=2015-w07-rc1
 */

var appEnv,
    revInfo = {};

var getRevInfo = function(project, cb) {

    if (fs.existsSync(path.join(project.root, '.hg')) || fs.existsSync(path.join(project.root, '..', '.hg'))) {
        var out = execSync('git describe --tags', {encoding: 'utf8'});
        revInfo.tag = out.trim();
        
        out = execSync("git branch | sed -n '/\* /s///p'", {encoding: 'utf8'});
        revInfo.branch = out.trim();

        out = execSync('git describe', {encoding: 'utf8'});
        revInfo.revision = 'git:' + out.trim();

        cb();
    } else if (fs.existsSync(path.join(project.root, '.git'))) {
        git.short(function(str) {
            revInfo.revision = 'git:' + str;

            git.branch(function(branch) {
                revInfo.branch = branch;

                git.tag(function(tag) {
                    revInfo.tag = tag;
                    cb();
                });
            });
        });
    } else {
        throw 'No hg or git revision found';
    }
};

function getBuildInfo(project, cb) {
    var buildInfo = '';

    fs.readFile(path.join(project.root, 'package.json'), {encoding: 'utf8'}, function(err, data) {
        
        if (err) { 
            throw err;
        }

        getRevInfo(project, function() {

            var pkg = JSON.parse(data);

            buildInfo += '[' + pkg.name + ']\n' +
                'configuration=' + appEnv + '\n' +
                'built_by=' + process.env.USER + '\n' +
                'build_date=' + (new Date()) + '\n' +
                'build_dir=' + (project.root) + '\n' +
                'build_host=' + require('os').hostname() + '\n' +
                'branch=' + (revInfo.branch?revInfo.branch:'Unknown') + '\n' +
                'revision=' + (revInfo.revision?revInfo.revision:'Unknown') + '\n' +
                'tag=' + (revInfo.tag?revInfo.tag:'') + '\n';

            cb(buildInfo);

        });

    });
}

module.exports = {

    name: 'ember-cli-make-buildinfo',

    config: function(env/*, appConfig*/) {
        appEnv = env;
    },

    postBuild: function(result) {
        var project = this.project;

        return new RSVP.Promise(function (resolve) {
            getBuildInfo(project, function(buildInfo) {
                fs.writeFileSync(path.join(result.directory, 'buildinfo.txt'), buildInfo,  'utf8');
                resolve();
            });
        });
    }
};
