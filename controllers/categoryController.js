const Category = require('../models/category');
const Item = require('../models/item');
const async = require('async');
const upload = require('./multer');

const { categoryValidators, validationResult } = require('./validation');

// Count the numebr of categories
exports.category_count = (req, res) => {
    Category.countDocuments({}, (err, count) => {
        res.render('index', { category_count: count });
    });
};

// List of all categories
exports.category_list = (req, res) => {
    Category.find().exec((err, category_list) => {
        res.render('categories', { categories: category_list });
    });
};

// Open category, list items
exports.open_category = (req, res, next) => {
    async.waterfall(
        [
            (cb) => {
                Category.findById(req.params.id).exec((err, res) => {
                    cb(null, err, res);
                });
            },
            (err, res, cb) => {
                if (res.items.length) {
                    Category.findById(req.params.id)
                        .populate('items')
                        .exec((err, res) => {
                            cb(null, res);
                        });
                } else {
                    cb(null, res);
                }
            },
        ],
        (err, category) => {
            if (err) return next(err);
            res.render('view_items', {
                category: category,

                items: category.items || null,
            });
        }
    );
};

exports.delete_category = (req, res, next) => {
    Category.findById(req.params.id, (err, category) => {
        if (err) return next(err);
        if (category.items.length) {
            res.render('delete_category', {
                category,
                hasItems: true,
                count: category.items.length,
                s: category.items.length === 1 ? '' : 's',
            });
        } else {
            res.render('delete_category', { category, noItems: true });
        }
    });
};

exports.delete_category_confirm = (req, res, next) => {
    Category.findByIdAndRemove(req.params.id, (err, doc) => {
        res.redirect('/');
    });
};

exports.create_category_form = (req, res, next) => {
    res.render('category_form', { title: 'Create a Category' });
};

exports.create_category = [
    (req, res, next) => {
        upload(req, res, (err) => {
            if (err) {
                res.locals.fileErr = 'File too large!';
            }
            next();
        });
    },
    ...categoryValidators,
    (req, res, next) => {
        const { name } = req.body;
        const errors = validationResult(req);

        //Check Errors
        if (!errors.isEmpty()) {
            let { param, msg } = errors.array({ onlyFirstError: true })[0];
            param = param + 'Err';
            return res.render('category_form', {
                title: 'Create a Category',
                name,
                [param]: msg,
            });
        } else if (res.locals.fileErr) {
            return res.render('category_form', {
                title: 'Create a Category',
                fileErr: res.locals.fileErr,
                name,
            });
        }

        const category = new Category({
            name: name,
            items: [],
            img: req.file ? req.file.filename : 'placeholder.jpg',
        });
        category.save((err) => {
            if (err) return next(err);
            res.redirect('/categories');
        });
    },
];
