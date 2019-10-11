#!/usr/bin/env node
const { basename, join, dirname } = require('path');
const { lstatSync } = require('fs');
const program = require('commander');
program.option('-d, --dist <dist>', '输出路径', './').parse(process.argv)
const { src, dest } = require('vinyl-fs');
const through = require('through2');
const got = require('got');
const c = require('ansi-colors');


//文件路径
const path = program.args[0];
//输出路径
const dist = program.dist;
const log = console.log;
log.error = string => {
    log(c.red(string));
};
log.done = string => {
    log(c.green(string));
};
const help = `
简介：
  命令行图片压缩工具,tinypng快速压缩图片

使用：
  png-t ./test.png
  png-t ./test/ -d ./dist

选项：
  -d, --dist   输出路径                                                [默认值: "当前目录"]
  -h, --help   帮助信息                                                [布尔]
`
if (!path) return log(help)
async function tinypngFree() {
    return through.obj(async (file, enc, done) => {
        if (file.isBuffer()) return await compress(file, enc, done);
        log.error(file.path + '不是png或jpg图片.');
        return done(null, file);
    });
}
async function compress(file, enc, done) {
    const filename = basename(file.path);
    const outpath = join(dirname(file.path), dist, filename);
    log(`开始压缩:${filename}`);
    let tinyFile = null
    try {
        let res = await got({
            url: 'https://tinypng.com/web/shrink',
            method: 'post',
            headers: {
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'zh-cn,zh;q=0.8,en-us;q=0.5,en;q=0.3',
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache',
                Connection: 'keep-alive',
                Host: 'tinypng.com',
                DNT: 1,
                Referer: 'https://tinypng.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:42.0) Gecko/20100101 Firefox/42.0',
            },
            body: file.contents,
        });
        res = JSON.parse(res.body);
        const url = res.output.url;
        log(`上传成功:${url}`);
        let data = await got(url, { encoding: null });
        tinyFile = file.clone();
        log.done(`压缩成功 输出路径:${outpath}`);
        data = Buffer.from(data.body, enc);
        tinyFile.contents = data;
    } catch (e) {
        log.error(`压缩失败 跳过压缩:${filename}`);
        log.error(e);
    }
    log('')
    done(null, tinyFile);
}

const handler = async ({ path, dist }) => {
    const stat = await lstatSync(path)
    const gulpFiles = stat.isFile() ? src([path]) : src([join(path, './*.png'), join(path, './*.jpg')])
    gulpFiles
        .pipe(await tinypngFree())
        .pipe(dest(dist));
};
handler({ path, dist })
