# Quick fix for syntax error - this will replace the problematic section

                        # Remove leading \r\n from line
                        clean_line = line.lstrip(b'\r\n')
                        if b'filename=' in clean_line:
                            # Extract filename
                            filename_part = clean_line.split(b'filename=')[1]
                            filename = filename_part.strip(b'"').decode('utf-8')
                            with open('debug.log', 'a') as f:
                                f.write(f"Found filename: {filename}\n")
                                f.write(f"Filename ends with .xml: {filename.endswith('.xml')}\n")
                        elif line.strip() == b'' and i < len(lines) - 1: