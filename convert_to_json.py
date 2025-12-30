import json
import re

def parse_content(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]

    # Remove line numbers if present (from cat -n)
    # The previous Read output had line numbers "1→", "2→". 
    # But I will assume the file I wrote with python redirect doesn't have them?
    # Wait, I ran `python3 extract_docx.py > extracted_content.txt`.
    # `extract_docx.py` prints the text.
    # So `extracted_content.txt` should be clean text.
    # Let's verify if `extracted_content.txt` has line numbers.
    # The `Read` tool output ADDS line numbers "1→".
    # So the file itself is clean.

    title = lines[0]
    
    passage = []
    questions = []
    current_question = None
    
    # Heuristic to find where passage ends and questions begin
    # Look for "1." or "1. " at start of line
    question_start_index = -1
    for i, line in enumerate(lines):
        if re.match(r'^1\.\s*\w+', line) or re.match(r'^1\.\s*According', line): # Adjust regex as needed
            question_start_index = i
            break
            
    if question_start_index == -1:
        # Fallback: maybe just "1."
        for i, line in enumerate(lines):
            if line.startswith("1."):
                question_start_index = i
                break

    if question_start_index != -1:
        passage = lines[1:question_start_index]
        question_lines = lines[question_start_index:]
    else:
        # Something wrong
        print("Could not find start of questions")
        return None

    # Parse questions
    # Structure:
    # 1. Question text
    # Options (A. B. C. D.)
    # Correct Answer
    
    current_q = {}
    
    # Iterate through question lines
    i = 0
    while i < len(question_lines):
        line = question_lines[i]
        
        # New Question Detection
        # Matches "1. Text", "2. Text", "10. Text"
        match = re.match(r'^(\d+)\.\s*(.*)', line)
        if match:
            if current_q:
                questions.append(current_q)
            
            q_id = int(match.group(1))
            q_text = match.group(2)
            
            # Type inference
            q_type = "detail"
            if "closest in meaning" in q_text:
                q_type = "vocabulary"
            elif "EXCEPT" in q_text:
                q_type = "negative-detail"
            elif "infer" in q_text or "imply" in q_text or "implies" in q_text:
                q_type = "inference"
            elif "summary" in q_text or "essential information" in q_text:
                q_type = "summary" # Or sentence-simplification
            elif "where the following sentence could be added" in q_text:
                q_type = "insertion"
            
            # Special case for insertion question which might be formatted differently
            # But let's stick to basic inference
            
            current_q = {
                "id": q_id,
                "text": q_text,
                "type": q_type,
                "options": [],
                "answer": ""
            }
            i += 1
            continue
            
        # Options
        # A. ...
        # Sometimes options are on one line or multiple
        if line.startswith("A.") or line.startswith("B.") or line.startswith("C.") or line.startswith("D.") or line.startswith("E.") or line.startswith("F."):
            current_q["options"].append(line)
            i += 1
            continue
            
        # Answer
        # Correct Answer：D
        if "Correct Answer" in line:
            # Extract answer (handle "Correct Answer：D" or "Correct Answer: D")
            ans_match = re.search(r'Correct Answer[:：]\s*([A-F]+)', line)
            if ans_match:
                current_q["answer"] = ans_match.group(1)
            i += 1
            continue
            
        # Extra lines (like "该题布置历史...")
        if "该题布置历史" in line:
            i += 1
            continue
            
        # If it's a continuation of question text or option
        # For simplicity, append to last option or question text
        # But usually lines are distinct.
        # Let's assume distinct for now.
        
        # Handling the "insertion" question square blocks or multi-line text
        if current_q and not current_q["options"] and not "Correct Answer" in line:
             current_q["text"] += " " + line
        elif current_q and current_q["options"]:
             # Maybe continuation of last option
             current_q["options"][-1] += " " + line
             
        i += 1

    if current_q:
        questions.append(current_q)

    return {
        "title": title,
        "passage": passage,
        "questions": questions
    }

data = parse_content("extracted_content.txt")
if data:
    with open("toefl-reading-mvp/data/questions_new.json", "w", encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Successfully created questions_new.json")
else:
    print("Failed to parse content")
