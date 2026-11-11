"""Compatibility entry point for Stories scrolling after moving the gallery into its picker.

The picker acceptance suite owns the native wheel, natural-size cards, viewport,
selection, focus and preserved-input checks for the dialog's actual scroll owner.
"""
from admin_stories_picker_regression import main


if __name__ == '__main__':
    main()
